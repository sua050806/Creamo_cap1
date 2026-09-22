from django.db import models


class CreatorRecommendation(models.Model):
    class Status(models.TextChoices):
        # 원래는 관리자가 admin/products-tab.tsx에서 크리에이터를 상품에 바로 연결했는데(수락 절차
        # 없음), "벤더가 제안하고 크리에이터가 수락/거절하는 게 실제 업계 관행과 맞다"는 지적으로
        # 상태를 추가함(ADR-051). 벤더가 제안하면 PENDING으로 시작하고, 크리에이터가 응답해야
        # ACCEPTED(공개 노출·커미션 대상)가 된다.
        PENDING = "pending", "제안됨"
        ACCEPTED = "accepted", "수락됨"
        REJECTED = "rejected", "거절됨"

    creator = models.ForeignKey(
        "accounts.CreatorProfile", on_delete=models.CASCADE, related_name="recommendations"
    )
    product = models.ForeignKey(
        "catalog.Product", on_delete=models.CASCADE, related_name="recommendations"
    )
    # 등록 시점에 Product.commission_rate를 복사해서 저장. 이후 관리자가 이 크리에이터에 한해서만
    # 값을 개별 조정할 수 있음(Product 기본값이나 다른 크리에이터의 값에는 영향 없음).
    commission_rate = models.DecimalField(max_digits=5, decimal_places=2)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING)
    created_at = models.DateTimeField(auto_now_add=True)
    # 크리에이터가 수락/거절한 시각. 벤더가 거절된 제안을 재요청하면(PENDING으로 되돌리면서
    # commission_rate를 새로 씀) 다시 비워진다.
    responded_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ("creator", "product")

    def __str__(self):
        return f"{self.creator.handle} -> {self.product.name} ({self.status})"
