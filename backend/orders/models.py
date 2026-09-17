from django.conf import settings
from django.db import models


class Order(models.Model):
    buyer = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="orders"
    )
    total_amount = models.PositiveIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Order #{self.id}"


class OrderItem(models.Model):
    class Status(models.TextChoices):
        # 결제 연동 전엔 주문 생성 즉시 PAID로 시작했었는데(ADR-035에서 발견한 설계 공백), 실제
        # 결제가 확인되기 전 상태인 PENDING을 새로 추가하고 이걸 기본값으로 바꿈 → ADR-036 참고.
        PENDING = "pending", "결제대기"
        PAID = "paid", "결제완료"
        PREPARING = "preparing", "상품준비"
        SHIPPING = "shipping", "배송중"
        DELIVERED = "delivered", "배송완료"
        # 배송중/배송완료 이후는 취소 불가(반품은 별도 기능, 이번 스코프 밖) → ADR-036 참고.
        CANCELLED = "cancelled", "취소됨"

    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey(
        "catalog.Product", on_delete=models.PROTECT, related_name="order_items"
    )
    creator = models.ForeignKey(
        "accounts.CreatorProfile",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="order_items",
    )
    quantity = models.PositiveIntegerField()
    # 주문 시점에 선택한 옵션 — CartItem.option과 같은 형태({"색상": "블랙"}). 취소 시 재고를 정확히
    # 원복하려면 "어떤 옵션 조합의 재고를 얼마나 뺐는지" 알아야 하는데 이 필드가 없어서 불가능했음
    # (주문 생성 때는 알고 있었지만 저장을 안 해뒀던 설계 공백) → ADR-036 참고.
    option = models.JSONField(default=dict, blank=True)
    # 주문 시점의 가격·커미션을 스냅샷으로 저장(Product/CreatorRecommendation이 나중에 바뀌어도 유지됨)
    unit_price = models.PositiveIntegerField()
    commission_amount = models.PositiveIntegerField()
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING)
    # 정산 생성(POST /admin/settlements/generate)에 이미 포함됐는지 표시. 배송완료된 항목 중 이 값이
    # 비어있는 것만 다음 정산 대상으로 잡아서, 버튼을 여러 번 눌러도 같은 항목이 중복으로 정산되지
    # 않게 한다 → ADR-038 참고.
    settled_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.product.name} x{self.quantity}"


class Cart(models.Model):
    buyer = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="cart"
    )
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.buyer.email}의 장바구니"


class CartItem(models.Model):
    cart = models.ForeignKey(Cart, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey(
        "catalog.Product", on_delete=models.CASCADE, related_name="cart_items"
    )
    creator = models.ForeignKey(
        "accounts.CreatorProfile",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="cart_items",
    )
    quantity = models.PositiveIntegerField(default=1)
    option = models.JSONField(default=dict, blank=True)

    def __str__(self):
        return f"{self.product.name} x{self.quantity}"
