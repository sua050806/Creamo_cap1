from rest_framework.permissions import BasePermission


class IsAdmin(BasePermission):
    """관리자 콘솔 API 전용 권한. role이 admin인 로그인 사용자만 통과시킨다."""

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and user.role == user.Role.ADMIN)
