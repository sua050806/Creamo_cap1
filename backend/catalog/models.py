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
    # 목록·상세 페이지 상단에 짧게 보여줄 한 줄 요약. description(상세 설명)과는 별개 필드.
    short_description = models.CharField(max_length=100, blank=True)
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
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.name

    def stock_key(self, option):
        """주문·장바구니에서 선택한 옵션(dict)을 stock JSON의 키 문자열로 바꾼다.
        옵션이 없는 상품은 "기본", 있으면 options에 등록된 키 순서대로 값을 "-"로 이어붙인다
        (예: {"색상": "블랙", "사이즈": "S"} → "블랙-S") → ADR-016 참고."""
        if not self.options:
            return "기본"
        return "-".join(str(option.get(name, "")) for name in self.options.keys())
