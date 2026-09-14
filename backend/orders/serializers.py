from rest_framework import serializers

from accounts.models import CreatorProfile
from catalog.models import Product

from .models import Cart, CartItem, Order, OrderItem


class CartItemProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = ["id", "name", "price", "thumbnail"]


class CartItemCreatorSerializer(serializers.ModelSerializer):
    class Meta:
        model = CreatorProfile
        fields = ["id", "handle"]


class CartItemSerializer(serializers.ModelSerializer):
    product = CartItemProductSerializer(read_only=True)
    creator = CartItemCreatorSerializer(read_only=True)
    subtotal = serializers.SerializerMethodField()

    class Meta:
        model = CartItem
        fields = ["id", "product", "creator", "quantity", "option", "subtotal"]

    def get_subtotal(self, item):
        return item.product.price * item.quantity


class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(many=True, read_only=True)
    total_amount = serializers.SerializerMethodField()

    class Meta:
        model = Cart
        fields = ["id", "items", "total_amount"]

    def get_total_amount(self, cart):
        return sum(item.product.price * item.quantity for item in cart.items.all())


# 결제완료(paid) < 상품준비(preparing) < 배송중(shipping) < 배송완료(delivered) 순서.
# 주문 목록의 status_summary는 "아직 안 끝난 것 중 가장 앞 단계"를 보여준다 — 여러 항목이 섞여 있을 때
# 그게 사실상 이 주문 전체의 병목 단계이기 때문.
_STATUS_ORDER = [OrderItem.Status.PAID, OrderItem.Status.PREPARING, OrderItem.Status.SHIPPING, OrderItem.Status.DELIVERED]


class OrderListSerializer(serializers.ModelSerializer):
    status_summary = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = ["id", "total_amount", "created_at", "status_summary"]

    def get_status_summary(self, order):
        statuses = {item.status for item in order.items.all()}
        for status in _STATUS_ORDER:
            if status in statuses:
                return OrderItem.Status(status).label
        return ""


class OrderDetailItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    creator_handle = serializers.CharField(source="creator.handle", read_only=True, default=None)
    status = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = OrderItem
        fields = ["id", "product_name", "creator_handle", "quantity", "unit_price", "status"]


class OrderDetailSerializer(serializers.ModelSerializer):
    items = OrderDetailItemSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = ["id", "total_amount", "created_at", "items"]
