from rest_framework import serializers

from accounts.models import User
from catalog.models import Category, Product
from orders.models import OrderItem
from settlements.models import Settlement
from vendors.models import VendorProfile


class AdminUserSerializer(serializers.ModelSerializer):
    # role=creator인 회원은 크리에이터 프로필 상태도 같이 보여준다(핸들·승인 상태). 일반 회원/관리자는 null.
    creator_handle = serializers.CharField(source="creator_profile.handle", read_only=True, default=None)
    creator_status = serializers.CharField(source="creator_profile.status", read_only=True, default=None)

    class Meta:
        model = User
        fields = ["id", "email", "name", "role", "date_joined", "creator_handle", "creator_status"]
        read_only_fields = fields


class AdminVendorSerializer(serializers.ModelSerializer):
    class Meta:
        model = VendorProfile
        fields = ["id", "name", "business_no", "contact", "settlement_account", "status"]
        read_only_fields = fields


class AdminProductSerializer(serializers.ModelSerializer):
    # 등록 화면에서는 벤더·카테고리를 id로 입력받고, 목록 화면에서는 이름도 같이 보여준다.
    vendor_id = serializers.PrimaryKeyRelatedField(source="vendor", queryset=VendorProfile.objects.all())
    vendor_name = serializers.CharField(source="vendor.name", read_only=True)
    category_id = serializers.PrimaryKeyRelatedField(source="category", queryset=Category.objects.all())
    category_name = serializers.CharField(source="category.name", read_only=True)

    class Meta:
        model = Product
        fields = [
            "id",
            "vendor_id",
            "vendor_name",
            "category_id",
            "category_name",
            "name",
            "description",
            "price",
            "commission_rate",
            "thumbnail",
            "options",
            "stock",
            "status",
            "created_at",
        ]
        read_only_fields = ["thumbnail", "status", "created_at"]


class AdminOrderItemSerializer(serializers.ModelSerializer):
    order_id = serializers.IntegerField(source="order.id", read_only=True)
    buyer_email = serializers.CharField(source="order.buyer.email", read_only=True)
    product_name = serializers.CharField(source="product.name", read_only=True)
    creator_handle = serializers.CharField(source="creator.handle", read_only=True, default=None)

    class Meta:
        model = OrderItem
        fields = [
            "id",
            "order_id",
            "buyer_email",
            "product_name",
            "creator_handle",
            "quantity",
            "unit_price",
            "commission_amount",
            "status",
        ]
        read_only_fields = [f for f in fields if f != "status"]


class AdminSettlementSerializer(serializers.ModelSerializer):
    target_name = serializers.SerializerMethodField()

    class Meta:
        model = Settlement
        fields = [
            "id",
            "target_type",
            "target_id",
            "target_name",
            "amount",
            "period_start",
            "period_end",
            "status",
            "approved_at",
        ]
        read_only_fields = fields

    def get_target_name(self, settlement):
        if settlement.target_type == Settlement.TargetType.VENDOR:
            vendor = VendorProfile.objects.filter(id=settlement.target_id).first()
            return vendor.name if vendor else None
        from accounts.models import CreatorProfile

        creator = CreatorProfile.objects.filter(id=settlement.target_id).first()
        return creator.handle if creator else None
