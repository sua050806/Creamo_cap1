from django.db import models


class Settlement(models.Model):
    class TargetType(models.TextChoices):
        VENDOR = "vendor", "벤더"
        CREATOR = "creator", "크리에이터"

    class Status(models.TextChoices):
        PENDING = "pending", "대기"
        APPROVED = "approved", "승인"
        COMPLETED = "completed", "완료"

    # target_type으로 VendorProfile/CreatorProfile 중 어느 쪽을 가리키는지 구분(GenericForeignKey 미사용)
    target_type = models.CharField(max_length=10, choices=TargetType.choices)
    target_id = models.PositiveIntegerField()
    amount = models.PositiveIntegerField()
    period_start = models.DateField()
    period_end = models.DateField()
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING)
    approved_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.target_type} #{self.target_id} 정산 ({self.period_start}~{self.period_end})"
