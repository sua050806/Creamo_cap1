from rest_framework.permissions import BasePermission


class IsApprovedCreator(BasePermission):
    """크리에이터 대시보드 전용 권한 — role=creator이고 CreatorProfile.status=approved인 본인만 통과."""

    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated and user.role == user.Role.CREATOR):
            return False
        profile = getattr(user, "creator_profile", None)
        return bool(profile and profile.status == profile.Status.APPROVED)
