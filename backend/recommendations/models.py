from django.db import models


class CreatorRecommendation(models.Model):
    creator = models.ForeignKey(
        "accounts.CreatorProfile", on_delete=models.CASCADE, related_name="recommendations"
    )
    product = models.ForeignKey(
        "catalog.Product", on_delete=models.CASCADE, related_name="recommendations"
    )
    # 등록 시점에 Product.commission_rate를 복사해서 저장. 이후 관리자가 이 크리에이터에 한해서만
    # 값을 개별 조정할 수 있음(Product 기본값이나 다른 크리에이터의 값에는 영향 없음).
    commission_rate = models.DecimalField(max_digits=5, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("creator", "product")

    def __str__(self):
        return f"{self.creator.handle} -> {self.product.name}"
