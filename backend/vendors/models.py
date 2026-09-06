from django.db import models


class VendorProfile(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "승인대기"
        APPROVED = "approved", "승인"
        REJECTED = "rejected", "반려"

    name = models.CharField(max_length=100)
    business_no = models.CharField(max_length=20)
    contact = models.CharField(max_length=100)
    settlement_account = models.CharField(max_length=100)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING)

    def __str__(self):
        return self.name
