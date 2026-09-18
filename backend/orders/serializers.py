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


# 결제대기(pending) < 결제완료(paid) < 상품준비(preparing) < 배송중(shipping) < 배송완료(delivered)
# 순서, 취소됨(cancelled)은 맨 뒤. 주문 목록의 status_summary는 "아직 안 끝난 것 중 가장 앞 단계"를
# 보여준다 — 여러 항목이 섞여 있을 때 그게 사실상 이 주문 전체의 병목 단계이기 때문.
_STATUS_ORDER = [
    OrderItem.Status.PENDING,
    OrderItem.Status.PAID,
    OrderItem.Status.PREPARING,
    OrderItem.Status.SHIPPING,
    OrderItem.Status.DELIVERED,
    OrderItem.Status.CANCELLED,
]


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
    # status는 한글 라벨(화면 표시용), status_code는 영문 슬러그(프론트가 "결제하기"/"취소" 버튼을
    # 보여줄지 판단할 때 한글 문자열을 파싱하지 않고 이걸로 비교하도록).
    status = serializers.CharField(source="get_status_display", read_only=True)
    status_code = serializers.CharField(source="status", read_only=True)

    class Meta:
        model = OrderItem
        fields = ["id", "product_name", "creator_handle", "quantity", "unit_price", "status", "status_code"]


class OrderDetailSerializer(serializers.ModelSerializer):
    items = OrderDetailItemSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = [
            "id",
            "total_amount",
            "created_at",
            "items",
            "recipient_name",
            "phone",
            "address",
            "address_detail",
        ]
