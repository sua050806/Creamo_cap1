from django.contrib.auth import authenticate, login, logout
from django.db.models import Sum
from django.middleware.csrf import get_token
from rest_framework import status
from rest_framework.generics import ListAPIView, RetrieveAPIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from catalog.models import Product
from orders.models import OrderItem
from recommendations.models import CreatorRecommendation
from vendors.models import VendorProfile

from .models import CreatorProfile
from .permissions import IsApprovedCreator
from .serializers import (
    CreatorDetailSerializer,
    CreatorProfileSerializer,
    CreatorPublicSerializer,
    CreatorRecommendationProductSerializer,
    SignupSerializer,
    UserSerializer,
)


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
        # 가입 직후 바로 다음 단계(크리에이터 프로필 작성 등)를 진행할 수 있게 자동 로그인시킨다.
        login(request, user, backend="django.contrib.auth.backends.ModelBackend")
        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)


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


class CreatorListView(ListAPIView):
    permission_classes = [AllowAny]
    serializer_class = CreatorPublicSerializer
    queryset = CreatorProfile.objects.filter(status=CreatorProfile.Status.APPROVED)


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
