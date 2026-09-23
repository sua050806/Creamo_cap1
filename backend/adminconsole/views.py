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
from settlements.services import generate_settlements
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
    """크리에이터·벤더 신규 가입 신청 심사. api-spec.md '관리자' 절 참고.

    벤더는 원래 로그인 계정이 없어(스펙 2.3) "심사할 신청" 개념 자체가 없다고 보고 여기서 뺐었는데
    (ADR-028), 벤더도 본인 계정으로 가입·신청하게 되면서(ADR-043) 다시 필요해짐. 단, 관리자가 예전
    방식대로 대신 등록한 레거시 벤더(user 없음)는 애초에 "신청"한 적이 없으므로 여기 목록에 안 나옴
    (VendorProfile.objects.filter(user__isnull=False)로 구분)."""

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
        ] + [
            {
                "type": "vendor",
                "id": profile.id,
                "name": f"{profile.user.name} ({profile.name})",
                "detail": profile.business_no,
                "status": profile.get_status_display(),
            }
            for profile in VendorProfile.objects.filter(user__isnull=False)
            .select_related("user")
            .order_by("-applied_at")
        ]
        return Response(applications)

    def post(self, request):
        app_id = request.data.get("id")
        app_type = request.data.get("type", "creator")
        decision = request.data.get("decision")

        if decision not in ("approve", "reject"):
            raise ValidationError({"decision": "decision은 approve 또는 reject여야 합니다."})
        if app_type not in ("creator", "vendor"):
            raise ValidationError({"type": "type은 creator 또는 vendor여야 합니다."})

        model = CreatorProfile if app_type == "creator" else VendorProfile
        label = "크리에이터" if app_type == "creator" else "벤더"
        approved_value = model.Status.APPROVED if app_type == "creator" else model.Status.ACTIVE
        rejected_value = model.Status.REJECTED

        try:
            profile = model.objects.get(id=app_id)
        except model.DoesNotExist:
            return Response({"error": f"{label} 신청을 찾을 수 없습니다."}, status=http_status.HTTP_404_NOT_FOUND)

        profile.status = approved_value if decision == "approve" else rejected_value
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
    """기존 상품에 추천 크리에이터를 연결/해제. 원래(ADR-034) 관리자 콘솔 "상품 관리" 탭에서 쓰던
    엔드포인트인데, 그 탭 자체를 없애면서(ADR-048) 지금은 UI에서 접근할 방법이 없다 — 다른 관리자
    엔드포인트들과 같은 이유로 지우지 않고 남겨둠. 벤더가 크리에이터에게 직접 제안하고 크리에이터가
    수락/거절하는 흐름이 새로 생기면서(ADR-051), CreatorRecommendation에 status가 추가됨 — 관리자가
    여기로 직접 연결하는 건 즉시 승인된 것으로 본다(수락 절차 없이 바로 accepted, 관리자 최종 권한).

    개별 크리에이터 커미션율 조정은 여전히 Django 관리자 사이트에서(ADR-021 그대로 유지)."""

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
            creator=creator,
            product=product,
            commission_rate=product.commission_rate,
            status=CreatorRecommendation.Status.ACCEPTED,
            responded_at=timezone.now(),
        )
        return Response(AdminProductSerializer(product).data, status=http_status.HTTP_201_CREATED)

    def delete(self, request, pk, creator_id):
        deleted, _ = CreatorRecommendation.objects.filter(product_id=pk, creator_id=creator_id).delete()
        if not deleted:
            return Response({"error": "추천 연결을 찾을 수 없습니다."}, status=http_status.HTTP_404_NOT_FOUND)

        product = Product.objects.get(id=pk)
        return Response(AdminProductSerializer(product).data)


class AdminOrderItemsView(APIView):
    """결제 관리 화면에 띄울 전체 주문 항목 목록. api-spec.md에 GET은 명시돼 있지 않지만 화면 구성상
    필요해서 추가."""

    permission_classes = [IsAdmin]

    def get(self, request):
        items = OrderItem.objects.select_related("order__buyer", "product", "creator").order_by("-id")
        return Response(AdminOrderItemSerializer(items, many=True).data)


# 상품준비/배송중/배송완료는 이제 벤더 본인이 직접 관리한다(accounts.views.VendorOrderItemStatusView,
# ADR-044). 관리자가 아무 벤더의 배송 상태나 바꿀 수 있던 예전 범위와 겹쳐서, 벤더 계정이 필수가 된
# 지금은(ADR-048) 관리자는 결제 확인/정정(결제대기↔결제완료)만 하도록 좁힘 — "배송 관리"가 아니라
# "결제 관리"가 됨. 상품준비 이후 단계는 여기서 손댈 수 없다(벤더 전담).
_ADMIN_EDITABLE_STATUSES = {OrderItem.Status.PENDING, OrderItem.Status.PAID}


class AdminOrderItemStatusView(APIView):
    """결제 상태 정정 — 결제대기/결제완료 사이만 관리자가 직접 바꿀 수 있다."""

    permission_classes = [IsAdmin]

    def patch(self, request, pk):
        try:
            item = OrderItem.objects.get(id=pk)
        except OrderItem.DoesNotExist:
            return Response({"error": "주문 항목을 찾을 수 없습니다."}, status=http_status.HTTP_404_NOT_FOUND)
        if item.status not in _ADMIN_EDITABLE_STATUSES:
            return Response(
                {"error": "결제대기/결제완료 상태인 주문 항목만 여기서 바꿀 수 있습니다(그 이후 단계는 벤더가 직접 관리합니다)."},
                status=http_status.HTTP_400_BAD_REQUEST,
            )

        new_status = request.data.get("status")
        if new_status not in {s.value for s in _ADMIN_EDITABLE_STATUSES}:
            allowed = ", ".join(sorted(s.value for s in _ADMIN_EDITABLE_STATUSES))
            raise ValidationError({"status": f"status는 {allowed} 중 하나여야 합니다."})

        item.status = new_status
        item.save(update_fields=["status"])
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
    """정산 대상·금액을 실제 주문 데이터로 계산해서 Settlement를 만든다(전체 벤더·크리에이터 일괄).
    원래는 Celery 배치가 주기적으로 미리 만들어두는 걸 가정했지만(AdminSettlementsView 참고), 4주
    캡스톤 스코프에서 별도 백그라운드 작업 인프라(Celery/주기 실행)까지 만들 시간 여유가 없어서
    관리자가 버튼을 누르면 그 자리에서 동기 계산하는 방식으로 단순화함 → ADR-038 참고.

    실제 계산 로직은 `settlements.services.generate_settlements`로 뺐음(ADR-053) —
    `VendorSettlementGenerateView`(벤더가 본인 몫만 계산)와 공유하기 위함. 배송완료(delivered)된
    주문 항목 중 아직 어떤 정산에도 포함되지 않은 것만 대상으로, 크리에이터별로는 commission_amount
    합계를, 벤더별로는 (판매금액 - 커미션) 합계를 각각 하나의 Settlement로 만든다."""

    permission_classes = [IsAdmin]

    def post(self, request):
        created = generate_settlements()
        return Response({"created": len(created), "settlements": AdminSettlementSerializer(created, many=True).data})
