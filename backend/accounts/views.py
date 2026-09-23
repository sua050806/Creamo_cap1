from django.contrib.auth import authenticate, login, logout
from django.db.models import Sum
from django.middleware.csrf import get_token
from rest_framework import status
from rest_framework.generics import ListAPIView, RetrieveAPIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from django.utils import timezone
from rest_framework.exceptions import ValidationError
from rest_framework.generics import ListCreateAPIView, RetrieveUpdateAPIView

from adminconsole.serializers import AdminOrderItemSerializer, AdminSettlementSerializer
from catalog.models import Product
from orders.models import OrderItem
from recommendations.models import CreatorRecommendation
from settlements.models import Settlement
from settlements.services import generate_settlements
from vendors.models import VendorProfile

from .models import CreatorProfile, User
from .permissions import IsApprovedCreator, IsApprovedVendor
from .serializers import (
    CreatorDetailSerializer,
    CreatorProfileSerializer,
    CreatorPublicSerializer,
    CreatorRecommendationProductSerializer,
    CreatorRecommendationRequestSerializer,
    SignupSerializer,
    UserSerializer,
    VendorProductSerializer,
    VendorProfileSerializer,
)
from .verification import VerificationError, clear_verification, send_verification_code, verify_code


class CsrfView(APIView):
    # 로그인 전(회원가입 등)에도 프론트가 CSRF 쿠키를 미리 받아둘 수 있게 하는 공개 엔드포인트.
    permission_classes = [AllowAny]

    def get(self, request):
        get_token(request)
        return Response({"detail": "ok"})


class SignupView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = SignupSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        # 인증 완료 표시는 1회용 — 가입이 끝났으면 지워서 재사용(같은 인증으로 또 가입 시도 등)을 막는다.
        clear_verification(user.email)
        # 가입 직후 바로 다음 단계(크리에이터 프로필 작성 등)를 진행할 수 있게 자동 로그인시킨다.
        login(request, user, backend="django.contrib.auth.backends.ModelBackend")
        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)


class CheckEmailView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get("email")
        if not email:
            return Response({"error": "email이 필요합니다."}, status=status.HTTP_400_BAD_REQUEST)
        return Response({"available": not User.objects.filter(email=email).exists()})


class SendVerificationCodeView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get("email")
        if not email:
            return Response({"error": "email이 필요합니다."}, status=status.HTTP_400_BAD_REQUEST)
        if User.objects.filter(email=email).exists():
            return Response({"error": "이미 가입된 이메일입니다."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            send_verification_code(email)
        except VerificationError as exc:
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response({"detail": "인증번호를 발송했습니다."})


class VerifyCodeView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get("email")
        code = request.data.get("code")
        if not email or not code:
            return Response({"error": "email과 code가 필요합니다."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            verify_code(email, code)
        except VerificationError as exc:
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response({"verified": True})


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get("email")
        password = request.data.get("password")
        user = authenticate(request, username=email, password=password)
        if user is None:
            return Response(
                {"error": "이메일 또는 비밀번호가 올바르지 않습니다."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        login(request, user)
        return Response(UserSerializer(user).data)


class LogoutView(APIView):
    def post(self, request):
        logout(request)
        return Response(status=status.HTTP_200_OK)


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # 프론트가 로그인 여부를 확인할 때 항상 거치는 지점이라, 여기서 CSRF 쿠키를 심어준다
        # (세션 쿠키 인증에는 CSRF 토큰이 필요 — ADR-011 참고).
        get_token(request)

        data = UserSerializer(request.user).data
        if request.user.role == request.user.Role.CREATOR:
            try:
                profile = request.user.creator_profile
                data["creator_profile"] = {"status": profile.status, "handle": profile.handle}
            except CreatorProfile.DoesNotExist:
                data["creator_profile"] = None
        if request.user.role == request.user.Role.VENDOR:
            try:
                profile = request.user.vendor_profile
                data["vendor_profile"] = {"status": profile.status, "name": profile.name}
            except VendorProfile.DoesNotExist:
                data["vendor_profile"] = None
        return Response(data)


class CreatorProfileCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if request.user.role != request.user.Role.CREATOR:
            return Response(
                {"error": "크리에이터로 가입한 계정만 프로필을 작성할 수 있습니다."},
                status=status.HTTP_403_FORBIDDEN,
            )
        if CreatorProfile.objects.filter(user=request.user).exists():
            return Response(
                {"error": "이미 크리에이터 프로필이 있습니다."}, status=status.HTTP_400_BAD_REQUEST
            )

        serializer = CreatorProfileSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(user=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class VendorProfileCreateView(APIView):
    """벤더 본인이 사업자 정보를 제출 — CreatorProfileCreateView와 같은 패턴(ADR-043). 제출 시점엔
    승인대기(pending)로 시작하고, 관리자가 신청 심사 화면에서 승인해야 실제로 상품을 등록할 수 있다
    (IsApprovedVendor가 active만 통과시킴)."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        if request.user.role != request.user.Role.VENDOR:
            return Response(
                {"error": "벤더로 가입한 계정만 신청서를 작성할 수 있습니다."},
                status=status.HTTP_403_FORBIDDEN,
            )
        if VendorProfile.objects.filter(user=request.user).exists():
            return Response(
                {"error": "이미 벤더 신청 내역이 있습니다."}, status=status.HTTP_400_BAD_REQUEST
            )

        serializer = VendorProfileSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(user=request.user, status=VendorProfile.Status.PENDING, applied_at=timezone.now())
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class VendorProductsView(ListCreateAPIView):
    """로그인한 본인 벤더가 공급하는 상품 목록·등록. 원래는 관리자가 오프라인으로 받은 정보를 대신
    등록했는데(AdminProductsView), 벤더도 본인 계정으로 직접 등록할 수 있게 함 → ADR-043 참고."""

    permission_classes = [IsApprovedVendor]
    serializer_class = VendorProductSerializer

    def get_queryset(self):
        return Product.objects.filter(vendor=self.request.user.vendor_profile).select_related("category")

    def perform_create(self, serializer):
        serializer.save(vendor=self.request.user.vendor_profile)


class VendorProductDetailView(RetrieveUpdateAPIView):
    """본인 상품 수정 — 다른 벤더의 상품은 queryset에 아예 안 걸려서 404(AdminProductDetailView와
    달리 본인 소유로 스코프를 좁힘)."""

    permission_classes = [IsApprovedVendor]
    serializer_class = VendorProductSerializer

    def get_queryset(self):
        return Product.objects.filter(vendor=self.request.user.vendor_profile)


class VendorProductStatusView(APIView):
    """본인 상품 판매중/품절/비활성 전환 — AdminProductStatusView와 같은 패턴, 본인 소유로 스코프."""

    permission_classes = [IsApprovedVendor]

    def patch(self, request, pk):
        product = Product.objects.filter(id=pk, vendor=request.user.vendor_profile).first()
        if product is None:
            return Response({"error": "상품을 찾을 수 없습니다."}, status=status.HTTP_404_NOT_FOUND)

        new_status = request.data.get("status")
        if new_status not in Product.Status.values:
            raise ValidationError({"status": f"status는 {Product.Status.values} 중 하나여야 합니다."})

        product.status = new_status
        product.save(update_fields=["status"])
        return Response({"id": product.id, "status": product.status})


class VendorRecommendationsView(APIView):
    """본인 상품에 크리에이터 추천을 제안/철회 — 벤더가 직접 크리에이터를 골라 커미션율을 제시하고,
    크리에이터가 수락해야 실제로 연결된다(ADR-051). 원래는 관리자가 상품 관리 화면에서 바로 연결해
    줬는데(ADR-034), "실제로는 벤더가 크리에이터한테 제안하고 크리에이터가 수락/거절하는 구조 아니냐"는
    지적으로 벤더-크리에이터 양방향 흐름으로 바꿈."""

    permission_classes = [IsApprovedVendor]

    def post(self, request, pk):
        product = Product.objects.filter(id=pk, vendor=request.user.vendor_profile).first()
        if product is None:
            return Response({"error": "상품을 찾을 수 없습니다."}, status=status.HTTP_404_NOT_FOUND)

        creator_id = request.data.get("creator_id")
        creator = CreatorProfile.objects.filter(id=creator_id, status=CreatorProfile.Status.APPROVED).first()
        if creator is None:
            return Response(
                {"error": "존재하지 않거나 승인되지 않은 크리에이터입니다."}, status=status.HTTP_404_NOT_FOUND
            )

        # 상품 기본 수수료율로 조용히 채워주지 않는다 — 벤더가 명시적으로 정한 값만 받는다.
        # 생략 시 자동 채워지면 "아직 아무것도 안 정했는데 이미 정해져 있다"는 오해를 부름(실제로
        # 그렇게 보인다는 지적을 받음) → ADR-052 참고.
        commission_rate = request.data.get("commission_rate")
        if commission_rate is None:
            raise ValidationError({"commission_rate": "수수료율을 입력해야 합니다."})
        try:
            commission_rate = float(commission_rate)
        except (TypeError, ValueError):
            raise ValidationError({"commission_rate": "숫자여야 합니다."})

        existing = CreatorRecommendation.objects.filter(creator=creator, product=product).first()
        if existing and existing.status in (
            CreatorRecommendation.Status.PENDING,
            CreatorRecommendation.Status.ACCEPTED,
        ):
            return Response(
                {"error": "이미 제안했거나 연결된 크리에이터입니다."}, status=status.HTTP_400_BAD_REQUEST
            )

        if existing:
            # 거절당했던 제안 — 새 커미션율로 다시 제안(재사용, unique_together 때문에 새로 못 만듦).
            existing.commission_rate = commission_rate
            existing.status = CreatorRecommendation.Status.PENDING
            existing.responded_at = None
            existing.save(update_fields=["commission_rate", "status", "responded_at"])
            recommendation = existing
        else:
            recommendation = CreatorRecommendation.objects.create(
                creator=creator, product=product, commission_rate=commission_rate
            )

        return Response(
            {
                "id": recommendation.id,
                "creator_id": recommendation.creator_id,
                "handle": recommendation.creator.handle,
                "commission_rate": recommendation.commission_rate,
                "status": recommendation.status,
            },
            status=status.HTTP_201_CREATED,
        )

    def delete(self, request, pk, creator_id):
        deleted, _ = CreatorRecommendation.objects.filter(
            product_id=pk, product__vendor=request.user.vendor_profile, creator_id=creator_id
        ).delete()
        if not deleted:
            return Response({"error": "제안·연결을 찾을 수 없습니다."}, status=status.HTTP_404_NOT_FOUND)
        return Response(status=status.HTTP_204_NO_CONTENT)


class VendorSettlementsView(APIView):
    """본인(벤더) 정산 내역 조회 — CreatorDashboardStatsView와 대응되는 벤더 쪽 대시보드 화면용."""

    permission_classes = [IsApprovedVendor]

    def get(self, request):
        # adminconsole.serializers를 재사용 — 관리자용과 정확히 같은 모양(target_name 등)이라
        # 벤더 전용으로 따로 만들 이유가 없음. target_id로 비교하므로(GenericForeignKey 미사용,
        # Settlement.models 참고) 다른 벤더/크리에이터 정산이 섞여 들어올 일은 없다.
        settlements = Settlement.objects.filter(
            target_type=Settlement.TargetType.VENDOR, target_id=request.user.vendor_profile.id
        ).order_by("-period_end")
        return Response(AdminSettlementSerializer(settlements, many=True).data)


class VendorSettlementGenerateView(APIView):
    """본인(벤더) 몫만 정산 계산을 트리거 — "정산 생성을 왜 관리자만 하냐, 벤더가 본인 몫은 직접
    계산 요청해야 하는 거 아니냐"는 지적으로 추가(ADR-053). `settlements.services.generate_settlements`
    를 본인 벤더로 스코프를 좁혀서 재사용 — 로직은 관리자용과 완전히 같고(실제 배송완료 주문 데이터로
    계산), 대상만 본인 상품이 포함된 주문으로 제한된다.

    이 계산에 딸린 크리에이터 커미션도 같이 생성됨(벤더 몫·크리에이터 몫이 같은 주문 항목에서 나오는
    한 쌍이라 분리 계산이 불가능 — 무선이어폰 하나 팔리면 그 39,000원 중 벤더 몫과 크리에이터 몫이
    동시에 정해짐). 실제 지급 승인(`POST /admin/settlements`)은 여전히 관리자만 할 수 있다 — 돈이
    플랫폼의 결제 계좌 하나로만 들어오고(PORTONE_STORE_ID가 전역 설정 하나) 벤더·크리에이터는 그
    돈에 직접 접근할 방법이 없어서, "계산"은 벤더가 트리거해도 "실제 지급 확정"은 그 돈을 쥐고 있는
    쪽(관리자)만 할 수 있는 게 맞다고 판단."""

    permission_classes = [IsApprovedVendor]

    def post(self, request):
        created = generate_settlements(vendor=request.user.vendor_profile)
        return Response({"created": len(created), "settlements": AdminSettlementSerializer(created, many=True).data})


# 관리자가 결제 확인 직후 상태(paid)로 되돌릴 일은 거의 없지만, AdminOrderItemStatusView와 동일하게
# 열어둔다 — 벤더가 실수로 다시 골라도 그 자체로는 실제 결제·재고와 어긋나지 않는 값이라 막을
# 이유가 없음(막아야 하는 건 pending/cancelled뿐, ShippingTab의 EDITABLE_STATUSES와 같은 기준).
_VENDOR_EDITABLE_STATUSES = {
    OrderItem.Status.PAID,
    OrderItem.Status.PREPARING,
    OrderItem.Status.SHIPPING,
    OrderItem.Status.DELIVERED,
}


class VendorOrderItemsView(APIView):
    """본인(벤더) 상품이 포함된 주문 항목 목록 — 배송 상태를 벤더가 직접 관리하게 됨(ADR-044).
    AdminOrderItemsView와 같은 모양이되 본인 상품으로 스코프."""

    permission_classes = [IsApprovedVendor]

    def get(self, request):
        items = (
            OrderItem.objects.filter(product__vendor=request.user.vendor_profile)
            .select_related("order__buyer", "product", "creator")
            .order_by("-id")
        )
        return Response(AdminOrderItemSerializer(items, many=True).data)


class VendorOrderItemStatusView(APIView):
    """본인(벤더) 상품 주문 항목의 배송 상태 변경 — AdminOrderItemStatusView와 같은 패턴, 본인
    상품으로 스코프. pending(결제대기)/cancelled(취소됨)는 여기서 못 바꾼다(ShippingTab의
    EDITABLE_STATUSES와 같은 이유 — 결제·취소는 각각 /payments/complete, /orders/{id}/cancel을
    거쳐야 실제 결제·재고 상태와 어긋나지 않음)."""

    permission_classes = [IsApprovedVendor]

    def patch(self, request, pk):
        item = OrderItem.objects.filter(id=pk, product__vendor=request.user.vendor_profile).first()
        if item is None:
            return Response({"error": "주문 항목을 찾을 수 없습니다."}, status=status.HTTP_404_NOT_FOUND)
        if item.status not in _VENDOR_EDITABLE_STATUSES:
            return Response(
                {"error": "결제 전이거나 취소된 주문 항목은 상태를 바꿀 수 없습니다."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        new_status = request.data.get("status")
        if new_status not in {s.value for s in _VENDOR_EDITABLE_STATUSES}:
            allowed = ", ".join(sorted(s.value for s in _VENDOR_EDITABLE_STATUSES))
            raise ValidationError({"status": f"status는 {allowed} 중 하나여야 합니다."})

        item.status = new_status
        item.save(update_fields=["status"])
        return Response({"id": item.id, "status": item.status})


class CreatorListView(ListAPIView):
    """공개 크리에이터 목록 — 고객용 크리에이터 탐색 페이지(/creators)에서 검색·카테고리 필터로 씀
    (ADR-049). `q`는 핸들 부분 일치 검색, `category_id`는 정확히 그 카테고리인 크리에이터만."""

    permission_classes = [AllowAny]
    serializer_class = CreatorPublicSerializer

    def get_queryset(self):
        queryset = CreatorProfile.objects.filter(status=CreatorProfile.Status.APPROVED)
        query = self.request.query_params.get("q")
        if query:
            queryset = queryset.filter(handle__icontains=query)
        category_id = self.request.query_params.get("category_id")
        if category_id:
            queryset = queryset.filter(category_id=category_id)
        return queryset


class CreatorDetailView(RetrieveAPIView):
    permission_classes = [AllowAny]
    serializer_class = CreatorDetailSerializer
    queryset = CreatorProfile.objects.filter(status=CreatorProfile.Status.APPROVED)


class CreatorProductsView(ListAPIView):
    permission_classes = [AllowAny]
    serializer_class = CreatorRecommendationProductSerializer

    def get_queryset(self):
        # 판매 중단된 벤더·판매중이 아닌 상품은 크리에이터 추천 목록에서도 숨긴다(ProductListView의
        # 홈/카테고리 목록 필터와 동일한 기준 — 원래 벤더 상태만 확인하고 상품 자체 status(품절/비활성)는
        # 안 가려서, 비활성 처리한 상품도 크리에이터 추천 목록엔 계속 남아있던 문제였음) → ADR-030 참고.
        return (
            CreatorRecommendation.objects.filter(
                creator_id=self.kwargs["pk"],
                status=CreatorRecommendation.Status.ACCEPTED,
                product__status=Product.Status.SELLING,
                product__vendor__status=VendorProfile.Status.ACTIVE,
            ).select_related("product")
        )


class CreatorDashboardStatsView(APIView):
    """로그인한 본인 크리에이터의 판매 통계. api-spec.md 'GET /creator/dashboard/stats' 참고.

    누적 커미션(commission_total)은 배송완료(delivered)로 끝난 주문만 확정으로 집계하고,
    아직 배송 중/준비 중인(결제는 이미 된) 건은 정산 예정액(commission_pending)으로 따로 보여준다.
    결제 연동·취소 기능(ADR-036)을 붙이며 OrderItem.Status에 pending(결제대기)/cancelled(취소됨)가
    새로 생겼는데, 이 뷰는 원래 paid/preparing/shipping/delivered 4단계만 있던 시절 로직이라
    "delivered만 아니면 전부 정산 예정"으로 계산하고 있었음 — 그러면 결제도 안 된 주문이나 취소된
    주문의 커미션까지 정산 예정액에 잡히는 실제 버그였음(통합 테스트 중 발견). 판매 건수(sales_count)도
    같은 이유로 결제대기/취소된 건은 "판매"로 볼 수 없어 제외한다."""

    permission_classes = [IsApprovedCreator]

    _UNSETTLED_STATUSES = (OrderItem.Status.PAID, OrderItem.Status.PREPARING, OrderItem.Status.SHIPPING)
    _NOT_A_SALE_STATUSES = (OrderItem.Status.PENDING, OrderItem.Status.CANCELLED)

    def get(self, request):
        items = OrderItem.objects.filter(creator=request.user.creator_profile)
        sales_count = items.exclude(status__in=self._NOT_A_SALE_STATUSES).count()
        commission_total = (
            items.filter(status=OrderItem.Status.DELIVERED).aggregate(total=Sum("commission_amount"))["total"] or 0
        )
        commission_pending = (
            items.filter(status__in=self._UNSETTLED_STATUSES).aggregate(total=Sum("commission_amount"))["total"] or 0
        )
        return Response(
            {
                "sales_count": sales_count,
                "commission_total": commission_total,
                "commission_pending": commission_pending,
            }
        )


class CreatorDashboardProductsView(APIView):
    """로그인한 본인 크리에이터가 추천한 상품별 판매 성과. api-spec.md 'GET /creator/dashboard/products' 참고.

    CreatorDashboardStatsView와 같은 이유로 결제대기(pending)/취소됨(cancelled) 상태인 주문 항목은
    "판매 성과"에서 제외한다."""

    permission_classes = [IsApprovedCreator]

    def get(self, request):
        rows = (
            OrderItem.objects.filter(creator=request.user.creator_profile)
            .exclude(status__in=(OrderItem.Status.PENDING, OrderItem.Status.CANCELLED))
            .values("product_id", "product__name")
            .annotate(sales_count=Sum("quantity"), commission_total=Sum("commission_amount"))
            .order_by("-commission_total")
        )
        data = [
            {
                "product_id": row["product_id"],
                "product_name": row["product__name"],
                "sales_count": row["sales_count"],
                "commission_total": row["commission_total"],
            }
            for row in rows
        ]
        return Response(data)


class CreatorRecommendationRequestsView(ListAPIView):
    """벤더로부터 받은 추천 제안 목록 — 본인 것만, 상태(대기/수락/거절) 무관 전체 이력을 보여주고
    프론트에서 대기중인 것만 수락/거절 버튼을 노출한다(ADR-051)."""

    permission_classes = [IsApprovedCreator]
    serializer_class = CreatorRecommendationRequestSerializer

    def get_queryset(self):
        return (
            CreatorRecommendation.objects.filter(creator=self.request.user.creator_profile)
            .select_related("product", "product__vendor")
            .order_by("-created_at")
        )


class CreatorRecommendationRespondView(APIView):
    """제안 수락/거절 — 본인에게 온 제안만, 아직 대기중(pending)인 것만 응답 가능."""

    permission_classes = [IsApprovedCreator]

    def post(self, request, pk):
        recommendation = CreatorRecommendation.objects.filter(
            id=pk, creator=request.user.creator_profile
        ).first()
        if recommendation is None:
            return Response({"error": "제안을 찾을 수 없습니다."}, status=status.HTTP_404_NOT_FOUND)
        if recommendation.status != CreatorRecommendation.Status.PENDING:
            return Response(
                {"error": "이미 응답한 제안입니다."}, status=status.HTTP_400_BAD_REQUEST
            )

        decision = request.data.get("decision")
        if decision not in ("accept", "reject"):
            raise ValidationError({"decision": "decision은 accept 또는 reject여야 합니다."})

        recommendation.status = (
            CreatorRecommendation.Status.ACCEPTED if decision == "accept" else CreatorRecommendation.Status.REJECTED
        )
        recommendation.responded_at = timezone.now()
        recommendation.save(update_fields=["status", "responded_at"])
        return Response(CreatorRecommendationRequestSerializer(recommendation).data)
