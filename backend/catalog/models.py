from django.db import models


class Category(models.Model):
    name = models.CharField(max_length=50)
    parent = models.ForeignKey(
        "self", on_delete=models.CASCADE, null=True, blank=True, related_name="children"
    )

    def __str__(self):
        return self.name


class Product(models.Model):
    class Status(models.TextChoices):
        SELLING = "selling", "판매중"
        SOLD_OUT = "sold_out", "품절"
        INACTIVE = "inactive", "비활성"

    vendor = models.ForeignKey(
        "vendors.VendorProfile", on_delete=models.PROTECT, related_name="products"
    )
    category = models.ForeignKey(Category, on_delete=models.PROTECT, related_name="products")
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    price = models.PositiveIntegerField()
    # 이 상품을 추천한 크리에이터에게 지급할 기본 수수료 비율(%). 크리에이터가 추천 등록 시
    # CreatorRecommendation.commission_rate로 복사되며, 그 이후 개별 조정은 이 필드에 영향을 주지 않음.
    commission_rate = models.DecimalField(max_digits=5, decimal_places=2)
    thumbnail = models.ImageField(upload_to="products/", blank=True, null=True)
    options = models.JSONField(default=dict, blank=True)
    # 옵션 조합별 재고. 예: {"블랙-S": 10, "화이트-M": 5}. 옵션이 없는 상품은 {"기본": 수량} 형태로 사용.
    stock = models.JSONField(default=dict)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.SELLING)

    def __str__(self):
        return self.name
