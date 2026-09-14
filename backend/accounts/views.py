from django.contrib.auth import authenticate, login, logout
from django.middleware.csrf import get_token
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import CreatorProfile
from .serializers import CreatorProfileSerializer, SignupSerializer, UserSerializer


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
