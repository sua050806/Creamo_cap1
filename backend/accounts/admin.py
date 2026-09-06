from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import CreatorProfile, User


@admin.register(User)
class CreamoUserAdmin(UserAdmin):
    list_display = ("email", "username", "role", "is_staff")
    ordering = ("email",)


@admin.register(CreatorProfile)
class CreatorProfileAdmin(admin.ModelAdmin):
    list_display = ("handle", "user", "category", "status", "applied_at", "approved_at")
    list_filter = ("status",)
    search_fields = ("handle", "user__email")
