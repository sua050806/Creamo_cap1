from django.db import transaction
from django.utils import timezone
from rest_framework import status as http_status
from rest_framework.exceptions import ValidationError
from rest_framework.generics import ListCreateAPIView, RetrieveUpdateAPIView
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import CreatorProfile, User
from catalog.models import Product
from orders.models import OrderItem
from recommendations.models import CreatorRecommendation
from settlements.models import Settlement
from vendors.models import VendorProfile

from .permissions import IsAdmin
from .serializers import (
    AdminOrderItemSerializer,
    AdminProductSerializer,
    AdminSettlementSerializer,
    AdminUserSerializer,
    AdminVendorSerializer,
)


class AdminVendorsView(APIView):
    """상품 등록 화면의 벤더 선택 드롭다운 + 회원 관리 화면의 벤더 목록용. 벤더는 로그인 계정이 없어
    공개 API가 없으므로 관리자 전용으로 제공."""

    permission_classes = [IsAdmin]

    def get(self, request):
        vendors = VendorProfile.objects.order_by("name")
        return Response(AdminVendorSerializer(vendors, many=True).data)


class AdminVendorStatusView(APIView):
    """벤더 활성/판매중단 전환. 판매중단으로 바꾸면 이 벤더의 상품이 목록·상세·크리에이터 추천에서
    전부 숨겨진다(개별 Product.status는 건드리지 않고 조회 시점에 필터링) → ADR-030 참고."""

    permission_classes = [IsAdmin]

    def patch(self, request, pk):
        try:
            vendor = VendorProfile.objects.get(id=pk)
        except VendorProfile.DoesNotExist:
            return Response({"error": "벤더를 찾을 수 없습니다."}, status=http_status.HTTP_404_NOT_FOUND)

        new_status = request.data.get("status")
        if new_status not in VendorProfile.Status.values:
            raise ValidationError({"status": f"status는 {VendorProfile.Status.values} 중 하나여야 합니다."})

        vendor.status = new_status
        vendor.save()
        return Response({"id": vendor.id, "status": vendor.status})


class AdminUsersView(APIView):
    """회원 관리 화면: 가입한 회원(일반 회원·크리에이터·관리자) 전체 목록. 벤더는 로그인 계정이 없어
    별도로 GET /admin/vendors에서 조회한다."""

    permission_classes = [IsAdmin]

    def get(self, request):
        users = User.objects.select_related("creator_profile").order_by("-date_joined")
        return Response(AdminUserSerializer(users, many=True).data)


class AdminUserRoleView(APIView):
    """회원의 역할(buyer/creator/admin)을 관리자가 직접 변경. 역할만 바꾸는 것이라, creator로 바꿔도
    CreatorProfile은 자동으로 생기지 않는다(본인이 /creator/apply로 별도 작성해야 함 — 스펙 2.4와 동일한 흐름)."""

    permission_classes = [IsAdmin]

    def patch(self, request, pk):
        try:
            user = User.objects.get(id=pk)
        except User.DoesNotExist:
            return Response({"error": "회원을 찾을 수 없습니다."}, status=http_status.HTTP_404_NOT_FOUND)

        new_role = request.data.get("role")
        if new_role not in User.Role.values:
            raise ValidationError({"role": f"role은 {User.Role.values} 중 하나여야 합니다."})

        user.role = new_role
        user.save()
        return Response({"id": user.id, "role": user.role})


class AdminApplicationsView(APIView):
    """크리에이터 신규 가입 신청 심사. api-spec.md '관리자' 절 참고.

    벤더는 여기 포함하지 않는다 — 벤더는 로그인 계정이 없어(스펙 2.3) 본인이 신청서를 내는 게 아니라
    관리자가 오프라인으로 받은 정보를 직접 입력해서 만드는 대상이라, "심사할 신청" 자체가 존재하지
    않는다(관리자가 등록하기로 결정한 시점에 이미 승인된 것과 같음) → ADR-028 참고."""

    permission_classes = [IsAdmin]

    def get(self, request):
        applications = [
            {
                "type": "creator",
                "id": profile.id,
                "name": f"{profile.user.name} (@{profile.handle})",
                "detail": profile.category.name if profile.category else "-",
                "status": profile.get_status_display(),
            }
            for profile in CreatorProfile.objects.select_related("user", "category").order_by("-applied_at")
        ]
        return Response(applications)

    def post(self, request):
        app_id = request.data.get("id")
        decision = request.data.get("decision")

        if decision not in ("approve", "reject"):
            raise ValidationError({"decision": "decision은 approve 또는 reject여야 합니다."})

        try:
            profile = CreatorProfile.objects.get(id=app_id)
        except CreatorProfile.DoesNotExist:
            return Response({"error": "크리에이터 신청을 찾을 수 없습니다."}, status=http_status.HTTP_404_NOT_FOUND)

        profile.status = (
            CreatorProfile.Status.APPROVED if decision == "approve" else CreatorProfile.Status.REJECTED
        )
        if decision == "approve":
            profile.approved_at = timezone.now()
        profile.save()
        return Response({"id": profile.id, "status": profile.status})


class AdminProductsView(ListCreateAPIView):
    """벤더로부터 오프라인으로 받은 상품 정보를 관리자가 대리 등록. api-spec.md 'GET/POST /admin/products' 참고.

    request에 creator_id(선택)를 같이 보내면, 상품을 만든 직후 바로 그 크리에이터의 추천으로도
    연결해준다 — 벤더가 "이 상품은 OO 크리에이터랑 협업하기로 했다"고 미리 알려준 경우 한 화면에서
    끝내기 위함 → ADR-034 참고."""

    permission_classes = [IsAdmin]
    serializer_class = AdminProductSerializer
    queryset = Product.objects.select_related("vendor", "category").all()

    def perform_create(self, serializer):
        product = serializer.save()

        creator_id = self.request.data.get("creator_id")
        if not creator_id:
            return

        try:
            creator = CreatorProfile.objects.get(id=creator_id, status=CreatorProfile.Status.APPROVED)
        except CreatorProfile.DoesNotExist:
            raise ValidationError({"creator_id": "존재하지 않거나 승인되지 않은 크리에이터입니다."})

        CreatorRecommendation.objects.create(
            creator=creator, product=product, commission_rate=product.commission_rate
        )


class AdminProductDetailView(RetrieveUpdateAPIView):
    """등록된 상품 수정용 — 이미지(thumbnail) 업로드/교체가 주 용도. 문서에는 없었지만(원래 GET/POST만
    명시) 상품 등록 화면에서 이미지 첨부 기능을 만들며 구현 중 추가."""

    permission_classes = [IsAdmin]
    serializer_class = AdminProductSerializer
    queryset = Product.objects.select_related("vendor", "category").all()


class AdminProductStatusView(APIView):
    """상품 판매중/품절/비활성 전환. 실제로 상품을 지우는 기능은 없다 — OrderItem.product가
    on_delete=PROTECT라 주문 이력이 하나라도 있으면 DB에서 지울 수 없고, 지운다 해도 그 상품을
    가리키던 과거 주문 내역이 깨진다. "삭제"에 해당하는 건 이 status를 inactive로 바꿔서
    목록/상세 노출에서 빼는 것(AdminVendorStatusView와 같은 패턴) — 배포 후 "상품 삭제는 어떻게
    하냐"는 질문으로 추가, status 자체는 이미 있었는데(catalog.models.Product.Status) 바꿀 수 있는
    화면이 없었음."""

    permission_classes = [IsAdmin]

    def patch(self, request, pk):
        try:
            product = Product.objects.get(id=pk)
        except Product.DoesNotExist:
            return Response({"error": "상품을 찾을 수 없습니다."}, status=http_status.HTTP_404_NOT_FOUND)

        new_status = request.data.get("status")
        if new_status not in Product.Status.values:
            raise ValidationError({"status": f"status는 {Product.Status.values} 중 하나여야 합니다."})

        product.status = new_status
        product.save(update_fields=["status"])
        return Response({"id": product.id, "status": product.status})


class AdminProductRecommendationsView(APIView):
    """기존 상품에 추천 크리에이터를 연결/해제. 등록 시점에 안 정했거나, 나중에 크리에이터를 추가·
    교체하고 싶을 때 사용 — CreatorRecommendation 생성을 원래 Django 관리자 사이트에서만 하던 것을
    (ADR-021/022) 관리자 콘솔에서도 할 수 있게 보강 → ADR-034 참고. 개별 크리에이터 커미션율 조정은
    여전히 Django 관리자 사이트에서(ADR-021 그대로 유지)."""

    permission_classes = [IsAdmin]

    def post(self, request, pk):
        try:
            product = Product.objects.get(id=pk)
        except Product.DoesNotExist:
            return Response({"error": "상품을 찾을 수 없습니다."}, status=http_status.HTTP_404_NOT_FOUND)

        creator_id = request.data.get("creator_id")
        try:
            creator = CreatorProfile.objects.get(id=creator_id, status=CreatorProfile.Status.APPROVED)
        except CreatorProfile.DoesNotExist:
            return Response(
                {"error": "존재하지 않거나 승인되지 않은 크리에이터입니다."},
                status=http_status.HTTP_404_NOT_FOUND,
            )

        if CreatorRecommendation.objects.filter(creator=creator, product=product).exists():
            return Response(
                {"error": "이미 이 크리에이터가 추천 중인 상품입니다."}, status=http_status.HTTP_400_BAD_REQUEST
            )

        CreatorRecommendation.objects.create(
            creator=creator, product=product, commission_rate=product.commission_rate
        )
        return Response(AdminProductSerializer(product).data, status=http_status.HTTP_201_CREATED)

    def delete(self, request, pk, creator_id):
        deleted, _ = CreatorRecommendation.objects.filter(product_id=pk, creator_id=creator_id).delete()
        if not deleted:
            return Response({"error": "추천 연결을 찾을 수 없습니다."}, status=http_status.HTTP_404_NOT_FOUND)

        product = Product.objects.get(id=pk)
        return Response(AdminProductSerializer(product).data)


class AdminOrderItemsView(APIView):
    """배송 상태 변경 화면에 띄울 목록. api-spec.md에 GET은 명시돼 있지 않지만 화면 구성상 필요해서 추가."""

    permission_classes = [IsAdmin]

    def get(self, request):
        items = OrderItem.objects.select_related("order__buyer", "product", "creator").order_by("-id")
        return Response(AdminOrderItemSerializer(items, many=True).data)


class AdminOrderItemStatusView(APIView):
    permission_classes = [IsAdmin]

    def patch(self, request, pk):
        try:
            item = OrderItem.objects.get(id=pk)
        except OrderItem.DoesNotExist:
            return Response({"error": "주문 항목을 찾을 수 없습니다."}, status=http_status.HTTP_404_NOT_FOUND)

        new_status = request.data.get("status")
        if new_status not in OrderItem.Status.values:
            raise ValidationError({"status": f"status는 {OrderItem.Status.values} 중 하나여야 합니다."})

        item.status = new_status
        item.save()
        return Response({"id": item.id, "status": item.status})


class AdminSettlementsView(APIView):
    """정산 승인. 대상·금액 계산 자체는 Celery 배치가 미리 만들어둔다고 가정하고, 여기서는 승인만 담당."""

    permission_classes = [IsAdmin]

    def get(self, request):
        settlements = Settlement.objects.order_by("-id")
        return Response(AdminSettlementSerializer(settlements, many=True).data)

    def post(self, request):
        settlement_id = request.data.get("id")
        decision = request.data.get("decision")

        if decision != "approve":
            raise ValidationError({"decision": "decision은 approve여야 합니다."})

        try:
            settlement = Settlement.objects.get(id=settlement_id)
        except Settlement.DoesNotExist:
            return Response({"error": "정산 항목을 찾을 수 없습니다."}, status=http_status.HTTP_404_NOT_FOUND)

        settlement.status = Settlement.Status.APPROVED
        settlement.approved_at = timezone.now()
        settlement.save()
        return Response({"id": settlement.id, "status": settlement.status})


class AdminSettlementGenerateView(APIView):
    """정산 대상·금액을 실제 주문 데이터로 계산해서 Settlement를 만든다. 원래는 Celery 배치가 주기적으로
    미리 만들어두는 걸 가정했지만(AdminSettlementsView 참고), 4주 캡스톤 스코프에서 별도 백그라운드
    작업 인프라(Celery/주기 실행)까지 만들 시간 여유가 없어서 관리자가 버튼을 누르면 그 자리에서 동기
    계산하는 방식으로 단순화함 → ADR-038 참고.

    배송완료(delivered)된 주문 항목 중 아직 어떤 정산에도 포함되지 않은 것(settled_at이 비어있는 것)만
    대상으로 하고, 크리에이터별로는 commission_amount 합계를, 벤더별로는 (판매금액 - 커미션) 합계를
    각각 하나의 Settlement로 만든다. 처리한 항목은 settled_at을 채워서 다음 실행 때 중복 집계되지
    않게 한다."""

    permission_classes = [IsAdmin]

    def post(self, request):
        with transaction.atomic():
            items = list(
                OrderItem.objects.select_for_update()
                .filter(status=OrderItem.Status.DELIVERED, settled_at__isnull=True)
                .select_related("order", "product")
            )
            if not items:
                return Response({"created": 0, "settlements": []})

            period_start = min(item.order.created_at for item in items).date()
            period_end = timezone.now().date()
            now = timezone.now()

            created = []

            creator_totals = {}
            for item in items:
                if item.creator_id is None:
                    continue
                creator_totals[item.creator_id] = creator_totals.get(item.creator_id, 0) + item.commission_amount
            for creator_id, amount in creator_totals.items():
                if amount <= 0:
                    continue
                settlement = Settlement.objects.create(
                    target_type=Settlement.TargetType.CREATOR,
                    target_id=creator_id,
                    amount=amount,
                    period_start=period_start,
                    period_end=period_end,
                )
                created.append(settlement)

            vendor_totals = {}
            for item in items:
                vendor_id = item.product.vendor_id
                revenue = item.unit_price * item.quantity - item.commission_amount
                vendor_totals[vendor_id] = vendor_totals.get(vendor_id, 0) + revenue
            for vendor_id, amount in vendor_totals.items():
                if amount <= 0:
                    continue
                settlement = Settlement.objects.create(
                    target_type=Settlement.TargetType.VENDOR,
                    target_id=vendor_id,
                    amount=amount,
                    period_start=period_start,
                    period_end=period_end,
                )
                created.append(settlement)

            OrderItem.objects.filter(id__in=[item.id for item in items]).update(settled_at=now)

        return Response({"created": len(created), "settlements": AdminSettlementSerializer(created, many=True).data})
