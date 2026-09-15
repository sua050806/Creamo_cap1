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
    # 이 상품을 추천 중인 크리에이터 목록(읽기 전용) — 연결 자체는 /admin/products/{id}/recommendations로.
    recommended_by = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            "id",
            "vendor_id",
            "vendor_name",
            "category_id",
            "category_name",
            "name",
            "short_description",
            "description",
            "price",
            "commission_rate",
            "thumbnail",
            "options",
            "stock",
            "status",
            "created_at",
            "recommended_by",
        ]
        read_only_fields = ["status", "created_at"]
        extra_kwargs = {"thumbnail": {"required": False}}

    def validate_options(self, value):
        # {"옵션명": ["값1", "값2"]} 형태여야 하는데, 관리자 화면이 JSON을 그냥 직접 입력받다 보니
        # {"블랙": 0, "화이트": 1}처럼 옵션값/재고를 헷갈려서 잘못된 모양으로 저장되는 사고가 실제로
        # 있었음(옵션명 자리에 옵션값을, 값 자리에 숫자를 넣음) — 프론트(product-actions.tsx)가
        # 옵션 값 목록을 배열로 가정하고 .map()을 호출해서 그대로 저장하면 상품 상세 페이지가 깨짐.
        if not isinstance(value, dict):
            raise serializers.ValidationError("옵션은 객체(JSON) 형태여야 합니다. 예: {\"색상\": [\"블랙\", \"화이트\"]}")
        for option_name, values in value.items():
            if not isinstance(values, list) or not all(isinstance(v, str) for v in values):
                raise serializers.ValidationError(
                    f'"{option_name}"의 값은 문자열 배열이어야 합니다. 예: {{"색상": ["블랙", "화이트"]}}'
                    " (옵션이 없는 상품이면 그냥 {} 로 둡니다)"
                )
        return value

    def get_recommended_by(self, product):
        recommendations = product.recommendations.select_related("creator")
        return [
            {"creator_id": rec.creator_id, "handle": rec.creator.handle} for rec in recommendations
        ]


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
