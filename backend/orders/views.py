import logging

from django.db import transaction
from rest_framework import status as http_status
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import CreatorProfile
from catalog.models import Product
from payments.models import Payment
from payments.portone import PortOneError, cancel_payment
from recommendations.models import CreatorRecommendation

from .models import Cart, CartItem, Order, OrderItem
from .serializers import CartSerializer, OrderDetailSerializer, OrderListSerializer

logger = logging.getLogger(__name__)


def _get_or_create_cart(user):
    cart, _ = Cart.objects.get_or_create(buyer=user)
    return cart


class CartView(APIView):
    """로그인한 본인의 장바구니 조회·담기. api-spec.md '장바구니' 절, erd.md Cart/CartItem 참고."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        cart = _get_or_create_cart(request.user)
        return Response(CartSerializer(cart, context={"request": request}).data)

    def post(self, request):
        cart = _get_or_create_cart(request.user)

        product_id = request.data.get("product_id")
        creator_id = request.data.get("creator_id")
        option = request.data.get("option") or {}

        try:
            quantity = int(request.data.get("quantity", 1))
        except (TypeError, ValueError):
            raise ValidationError({"quantity": "수량은 숫자여야 합니다."})
        if quantity < 1:
            raise ValidationError({"quantity": "수량은 1 이상이어야 합니다."})

        try:
            product = Product.objects.get(id=product_id)
        except Product.DoesNotExist:
            return Response({"error": "상품을 찾을 수 없습니다."}, status=http_status.HTTP_404_NOT_FOUND)

        creator = None
        if creator_id:
            try:
                creator = CreatorProfile.objects.get(id=creator_id)
            except CreatorProfile.DoesNotExist:
                return Response({"error": "크리에이터를 찾을 수 없습니다."}, status=http_status.HTTP_404_NOT_FOUND)

        # 상품+옵션+추천 크리에이터 조합이 모두 같으면 새 줄 대신 수량만 늘린다 → ADR-020 참고.
        existing = CartItem.objects.filter(cart=cart, product=product, creator=creator, option=option).first()
        if existing:
            existing.quantity += quantity
            existing.save()
        else:
            CartItem.objects.create(cart=cart, product=product, creator=creator, quantity=quantity, option=option)

        return Response(CartSerializer(cart, context={"request": request}).data)


class CartItemView(APIView):
    """장바구니 항목 수량 변경·삭제. 문서에는 없었지만(원래 GET/POST /cart만 명시) 실제 장바구니
    화면에서 수량 조절·삭제가 꼭 필요해서 구현 중 추가."""

    permission_classes = [IsAuthenticated]

    def _get_item(self, request, pk):
        return CartItem.objects.filter(id=pk, cart__buyer=request.user).first()

    def patch(self, request, pk):
        item = self._get_item(request, pk)
        if item is None:
            return Response({"error": "장바구니 항목을 찾을 수 없습니다."}, status=http_status.HTTP_404_NOT_FOUND)

        try:
            quantity = int(request.data.get("quantity"))
        except (TypeError, ValueError):
            raise ValidationError({"quantity": "수량은 숫자여야 합니다."})
        if quantity < 1:
            raise ValidationError({"quantity": "수량은 1 이상이어야 합니다."})

        item.quantity = quantity
        item.save()
        return Response(CartSerializer(item.cart, context={"request": request}).data)

    def delete(self, request, pk):
        item = self._get_item(request, pk)
        if item is None:
            return Response({"error": "장바구니 항목을 찾을 수 없습니다."}, status=http_status.HTTP_404_NOT_FOUND)

        cart = item.cart
        item.delete()
        return Response(CartSerializer(cart, context={"request": request}).data)


def _resolve_order_item(raw_item):
    """POST /orders의 items 배열 한 줄을 검증하고, 주문 생성에 필요한 값들을 미리 계산해둔다.
    실패하면 ValidationError를 던진다 — 재고 차감 등 실제 DB 변경 전에 전부 검증부터 끝내기 위함."""
    product_id = raw_item.get("product_id")
    creator_id = raw_item.get("creator_id")
    option = raw_item.get("option") or {}

    try:
        quantity = int(raw_item.get("quantity", 1))
    except (TypeError, ValueError):
        raise ValidationError({"items": "quantity는 숫자여야 합니다."})
    if quantity < 1:
        raise ValidationError({"items": "quantity는 1 이상이어야 합니다."})

    try:
        product = Product.objects.get(id=product_id)
    except Product.DoesNotExist:
        raise ValidationError({"items": f"상품(id={product_id})을 찾을 수 없습니다."})
    if product.status != Product.Status.SELLING:
        raise ValidationError({"items": f"'{product.name}'은(는) 지금 주문할 수 없는 상태입니다."})

    stock_key = product.stock_key(option)
    available = product.stock.get(stock_key)
    if available is None:
        raise ValidationError({"items": f"'{product.name}'에 존재하지 않는 옵션 조합입니다."})
    if available < quantity:
        raise ValidationError({"items": f"'{product.name}' 재고가 부족합니다. (남은 수량: {available})"})

    creator = None
    commission_rate = product.commission_rate
    if creator_id:
        try:
            creator = CreatorProfile.objects.get(id=creator_id, status=CreatorProfile.Status.APPROVED)
        except CreatorProfile.DoesNotExist:
            raise ValidationError({"items": "존재하지 않거나 승인되지 않은 크리에이터입니다."})
        recommendation = CreatorRecommendation.objects.filter(creator=creator, product=product).first()
        if recommendation:
            commission_rate = recommendation.commission_rate

    # 가격·커미션은 지금 시점 값을 스냅샷으로 저장 — 나중에 상품 가격이나 커미션율이 바뀌어도
    # 이미 발생한 주문 금액은 변하지 않아야 함 → ADR-007 참고.
    unit_price = product.price
    commission_amount = int(unit_price * quantity * commission_rate / 100) if creator else 0

    return {
        "product": product,
        "creator": creator,
        "quantity": quantity,
        "option": option,
        "stock_key": stock_key,
        "unit_price": unit_price,
        "commission_amount": commission_amount,
    }


class OrderListCreateView(APIView):
    """본인 주문 목록 조회·생성. api-spec.md '주문' 절 참고. 장바구니와는 별개 API — 프론트가
    장바구니 내용이든 "바로구매" 단일 상품이든 items 배열로 직접 넘긴다. 재고는 주문 생성 시점에
    바로 차감(=이 주문이 재고를 선점)하지만, 실제 결제 확인 전까지 OrderItem.status는 PENDING(결제대기)
    으로 시작한다 → ADR-036 참고. 결제는 POST /payments/complete에서 별도로 확인한다."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        orders = Order.objects.filter(buyer=request.user).prefetch_related("items").order_by("-created_at")
        return Response(OrderListSerializer(orders, many=True).data)

    def post(self, request):
        raw_items = request.data.get("items")
        if not raw_items:
            raise ValidationError({"items": "최소 1개 이상의 상품이 필요합니다."})

        resolved_items = [_resolve_order_item(raw_item) for raw_item in raw_items]

        with transaction.atomic():
            # select_for_update로 동시에 들어온 다른 주문과 재고를 두고 경합하지 않게 함.
            for resolved in resolved_items:
                product = Product.objects.select_for_update().get(id=resolved["product"].id)
                available = product.stock.get(resolved["stock_key"], 0)
                if available < resolved["quantity"]:
                    raise ValidationError(
                        {"items": f"'{product.name}' 재고가 부족합니다. (남은 수량: {available})"}
                    )
                product.stock[resolved["stock_key"]] = available - resolved["quantity"]
                product.save(update_fields=["stock"])

            total_amount = sum(r["unit_price"] * r["quantity"] for r in resolved_items)
            order = Order.objects.create(buyer=request.user, total_amount=total_amount)
            OrderItem.objects.bulk_create(
                [
                    OrderItem(
                        order=order,
                        product=r["product"],
                        creator=r["creator"],
                        quantity=r["quantity"],
                        option=r["option"],
                        unit_price=r["unit_price"],
                        commission_amount=r["commission_amount"],
                    )
                    for r in resolved_items
                ]
            )

        return Response({"order_id": order.id, "total_amount": order.total_amount}, status=http_status.HTTP_201_CREATED)


class OrderDetailView(APIView):
    """본인 주문 상세 조회. api-spec.md 'GET /orders/{id}' 참고."""

    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        order = Order.objects.filter(id=pk, buyer=request.user).prefetch_related("items").first()
        if order is None:
            return Response({"error": "주문을 찾을 수 없습니다."}, status=http_status.HTTP_404_NOT_FOUND)
        return Response(OrderDetailSerializer(order).data)


_NON_CANCELLABLE_STATUSES = {OrderItem.Status.SHIPPING, OrderItem.Status.DELIVERED}


class OrderCancelView(APIView):
    """주문 취소. 배송중/배송완료 이후는 취소 불가(반품은 별도 기능, 이번 스코프 밖) → ADR-036 참고.
    결제가 이미 완료된 주문이면 포트원에 실제 결제취소(환불)를 요청하고, 아직 결제 전이면 그대로
    취소 처리만 한다. 어느 쪽이든 차감했던 재고는 원복한다."""

    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        order = Order.objects.filter(id=pk, buyer=request.user).prefetch_related("items").first()
        if order is None:
            return Response({"error": "주문을 찾을 수 없습니다."}, status=http_status.HTTP_404_NOT_FOUND)

        items = list(order.items.all())
        if any(item.status in _NON_CANCELLABLE_STATUSES for item in items):
            return Response(
                {"error": "배송이 시작된 주문은 취소할 수 없습니다."}, status=http_status.HTTP_400_BAD_REQUEST
            )
        if all(item.status == OrderItem.Status.CANCELLED for item in items):
            return Response({"error": "이미 취소된 주문입니다."}, status=http_status.HTTP_400_BAD_REQUEST)

        completed_payment = (
            Payment.objects.filter(order=order, status=Payment.Status.COMPLETED).order_by("-id").first()
        )
        if completed_payment:
            try:
                cancel_payment(completed_payment.pg_transaction_id, reason="구매자 요청", amount=order.total_amount)
            except PortOneError as exc:
                # 포트원이 돌려준 원문(내부 에러 코드·문구)은 사용자에게 그대로 보여주지 않고
                # 서버 로그에만 남긴다 — 디버깅 시엔 이 로그로 실제 사유를 확인한다.
                logger.warning("주문 %s 결제 취소 실패: %s", order.id, exc)
                return Response(
                    {"error": "결제 취소에 실패했습니다. 잠시 후 다시 시도해주세요."},
                    status=http_status.HTTP_502_BAD_GATEWAY,
                )

        with transaction.atomic():
            if completed_payment:
                completed_payment.status = Payment.Status.CANCELLED
                completed_payment.save(update_fields=["status"])

            for item in items:
                if item.status == OrderItem.Status.CANCELLED:
                    continue
                # select_for_update로 다른 요청과 재고 복원이 겹치지 않게 함.
                product = Product.objects.select_for_update().get(id=item.product_id)
                stock_key = product.stock_key(item.option)
                product.stock[stock_key] = product.stock.get(stock_key, 0) + item.quantity
                product.save(update_fields=["stock"])
                item.status = OrderItem.Status.CANCELLED
                item.save(update_fields=["status"])

        return Response(OrderDetailSerializer(order).data)
