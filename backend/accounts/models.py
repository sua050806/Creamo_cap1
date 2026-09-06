from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    class Role(models.TextChoices):
        BUYER = "buyer", "구매자"
        CREATOR = "creator", "크리에이터"
        ADMIN = "admin", "관리자"

    email = models.EmailField(unique=True)
    role = models.CharField(max_length=10, choices=Role.choices, default=Role.BUYER)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["username"]

    def __str__(self):
        return self.email


class CreatorProfile(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "승인대기"
        APPROVED = "approved", "승인"
        REJECTED = "rejected", "반려"

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="creator_profile")
    handle = models.CharField(max_length=50, unique=True)
    category = models.ForeignKey(
        "catalog.Category", on_delete=models.SET_NULL, null=True, related_name="creators"
    )
    intro = models.TextField(blank=True)
    profile_image = models.ImageField(upload_to="creator_profiles/", blank=True, null=True)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING)
    applied_at = models.DateTimeField(auto_now_add=True)
    approved_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return self.handle
