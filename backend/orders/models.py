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
        PAID = "paid", "결제완료"
        PREPARING = "preparing", "상품준비"
        SHIPPING = "shipping", "배송중"
        DELIVERED = "delivered", "배송완료"

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
    # 주문 시점의 가격·커미션을 스냅샷으로 저장(Product/CreatorRecommendation이 나중에 바뀌어도 유지됨)
    unit_price = models.PositiveIntegerField()
    commission_amount = models.PositiveIntegerField()
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PAID)

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
