from rest_framework import status as http_status
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import CreatorProfile
from catalog.models import Product

from .models import Cart, CartItem
from .serializers import CartSerializer


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
