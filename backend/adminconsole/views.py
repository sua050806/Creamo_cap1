from django.utils import timezone
from rest_framework import status as http_status
from rest_framework.exceptions import ValidationError
from rest_framework.generics import ListCreateAPIView
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import CreatorProfile
from catalog.models import Product
from orders.models import OrderItem
from settlements.models import Settlement
from vendors.models import VendorProfile

from .permissions import IsAdmin
from .serializers import AdminOrderItemSerializer, AdminProductSerializer, AdminSettlementSerializer


class AdminVendorsView(APIView):
    """상품 등록 화면의 벤더 선택 드롭다운용. 벤더는 로그인 계정이 없어 공개 API가 없으므로 관리자 전용으로 제공."""

    permission_classes = [IsAdmin]

    def get(self, request):
        vendors = VendorProfile.objects.order_by("name").values("id", "name")
        return Response(list(vendors))


class AdminApplicationsView(APIView):
    """벤더·크리에이터 신규 가입 신청 통합 심사. api-spec.md '관리자' 절 참고."""

    permission_classes = [IsAdmin]

    def get(self, request):
        applications = []

        for profile in CreatorProfile.objects.select_related("user", "category").order_by("-applied_at"):
            applications.append(
                {
                    "type": "creator",
                    "id": profile.id,
                    "name": f"{profile.user.name} (@{profile.handle})",
                    "detail": profile.category.name if profile.category else "-",
                    "status": profile.get_status_display(),
                }
            )

        for vendor in VendorProfile.objects.order_by("-id"):
            applications.append(
                {
                    "type": "vendor",
                    "id": vendor.id,
                    "name": vendor.name,
                    "detail": vendor.business_no,
                    "status": vendor.get_status_display(),
                }
            )

        return Response(applications)

    def post(self, request):
        app_type = request.data.get("type")
        app_id = request.data.get("id")
        decision = request.data.get("decision")

        if decision not in ("approve", "reject"):
            raise ValidationError({"decision": "decision은 approve 또는 reject여야 합니다."})

        if app_type == "creator":
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

        if app_type == "vendor":
            try:
                vendor = VendorProfile.objects.get(id=app_id)
            except VendorProfile.DoesNotExist:
                return Response({"error": "벤더 신청을 찾을 수 없습니다."}, status=http_status.HTTP_404_NOT_FOUND)
            vendor.status = (
                VendorProfile.Status.APPROVED if decision == "approve" else VendorProfile.Status.REJECTED
            )
            vendor.save()
            return Response({"id": vendor.id, "status": vendor.status})

        raise ValidationError({"type": "type은 creator 또는 vendor여야 합니다."})


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
