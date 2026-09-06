from django.db import models


class Payment(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "대기"
        COMPLETED = "completed", "완료"
        FAILED = "failed", "실패"
        CANCELLED = "cancelled", "취소"

    # 결제 재시도마다 새 레코드를 만든다(Order와 1:N) — 실패 이력을 그대로 보존하기 위함
    order = models.ForeignKey("orders.Order", on_delete=models.CASCADE, related_name="payments")
    pg_transaction_id = models.CharField(max_length=100)
    method = models.CharField(max_length=20)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING)
    paid_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"Payment #{self.id} for Order #{self.order_id}"
