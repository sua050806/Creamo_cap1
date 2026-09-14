from django.utils import timezone
from rest_framework import status as http_status
from rest_framework.exceptions import ValidationError
from rest_framework.generics import ListCreateAPIView
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import CreatorProfile, User
from catalog.models import Product
from orders.models import OrderItem
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
    """벤더로부터 오프라인으로 받은 상품 정보를 관리자가 대리 등록. api-spec.md 'GET/POST /admin/products' 참고."""

    permission_classes = [IsAdmin]
    serializer_class = AdminProductSerializer
    queryset = Product.objects.select_related("vendor", "category").all()


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
