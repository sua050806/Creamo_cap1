from rest_framework import serializers

from catalog.models import Category, Product
from recommendations.models import CreatorRecommendation
from vendors.models import VendorProfile

from .models import CreatorProfile, User
from .verification import is_email_verified


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "email", "name", "role"]


class SignupSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ["email", "password", "name", "role"]

    def validate_role(self, value):
        if value not in (User.Role.BUYER, User.Role.CREATOR, User.Role.VENDOR):
            raise serializers.ValidationError("가입 시 선택할 수 있는 역할은 구매자, 크리에이터, 벤더입니다.")
        return value

    def validate_email(self, value):
        # POST /auth/verify-code로 인증을 마쳐야만 Redis에 이 값이 존재함(ADR-039 참고) — 인증
        # 절차를 안 거치고 가입 API를 직접 호출하는 걸 막는 최종 방어선.
        if not is_email_verified(value):
            raise serializers.ValidationError("이메일 인증을 먼저 완료해주세요.")
        return value

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = User(username=validated_data["email"], **validated_data)
        user.set_password(password)
        user.save()
        return user


class CreatorProfileSerializer(serializers.ModelSerializer):
    category_id = serializers.PrimaryKeyRelatedField(source="category", queryset=Category.objects.all())

    class Meta:
        model = CreatorProfile
        fields = ["id", "handle", "category_id", "intro", "status"]
        read_only_fields = ["status"]


class CreatorPublicSerializer(serializers.ModelSerializer):
    # 공개 화면에서는 카테고리를 id가 아니라 이름으로 보여준다(목업 데이터와 동일한 형태).
    category = serializers.CharField(source="category.name", default=None)

    class Meta:
        model = CreatorProfile
        fields = ["id", "handle", "category", "profile_image"]


class CreatorDetailSerializer(CreatorPublicSerializer):
    class Meta(CreatorPublicSerializer.Meta):
        fields = CreatorPublicSerializer.Meta.fields + ["intro"]


class VendorProfileSerializer(serializers.ModelSerializer):
    # 벤더 본인이 신청서를 작성할 때 쓰는 시리얼라이저 — status/user는 뷰에서 직접 지정하므로
    # 여기서는 입력받지 않는다(크리에이터 CreatorProfileSerializer와 같은 패턴).
    class Meta:
        model = VendorProfile
        fields = ["id", "name", "business_no", "contact", "settlement_account", "status"]
        read_only_fields = ["status"]


class VendorProductSerializer(serializers.ModelSerializer):
    # 관리자용 AdminProductSerializer와 달리 vendor_id를 입력받지 않는다 — 벤더 본인 상품만
    # 다루므로 요청자의 vendor_profile로 뷰에서 강제 지정(임의의 벤더로 등록하는 걸 막기 위함).
    category_id = serializers.PrimaryKeyRelatedField(source="category", queryset=Category.objects.all())
    category_name = serializers.CharField(source="category.name", read_only=True)
    # 이 상품에 걸린 크리에이터 제안/연결 현황 — 벤더 대시보드에서 누구에게 제안했고 수락/거절/대기
    # 상태가 뭔지 보여주기 위함(ADR-051).
    recommendations = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            "id",
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
            "recommendations",
        ]
        read_only_fields = ["status", "created_at"]
        extra_kwargs = {"thumbnail": {"required": False}}

    def get_recommendations(self, product):
        recs = CreatorRecommendation.objects.filter(product=product).select_related("creator")
        return [
            {
                "id": r.id,
                "creator_id": r.creator_id,
                "handle": r.creator.handle,
                "commission_rate": r.commission_rate,
                "status": r.status,
            }
            for r in recs
        ]

    def validate_options(self, value):
        # AdminProductSerializer.validate_options와 같은 이유의 방어 — 옵션명/값 자리를 헷갈려서
        # 잘못된 모양({"블랙": 0} 등)으로 저장되면 상품 상세 페이지가 깨짐.
        if not isinstance(value, dict):
            raise serializers.ValidationError("옵션은 객체(JSON) 형태여야 합니다. 예: {\"색상\": [\"블랙\", \"화이트\"]}")
        for option_name, values in value.items():
            if not isinstance(values, list) or not all(isinstance(v, str) for v in values):
                raise serializers.ValidationError(
                    f'"{option_name}"의 값은 문자열 배열이어야 합니다. 예: {{"색상": ["블랙", "화이트"]}}'
                    " (옵션이 없는 상품이면 그냥 {} 로 둡니다)"
                )
        return value


class CreatorRecommendationProductSerializer(serializers.Serializer):
    # CreatorRecommendation을 상품 목록처럼 보여준다 — commission_rate는 이 크리에이터에게
    # 적용되는 값(ADR-012, 개별 조정 가능)이라 Product.commission_rate가 아니라 여기서 가져온다.
    id = serializers.IntegerField(source="product.id")
    name = serializers.CharField(source="product.name")
    price = serializers.IntegerField(source="product.price")
    # 원래 thumbnail이 빠져있어서 홈 화면 "추천 크리에이터" 섹션 상품 카드가 항상 회색 그라데이션
    # 플레이스홀더만 보여주고 있었음(통합 테스트 중 발견) — ProductListSerializer와 동일하게 추가.
    thumbnail = serializers.ImageField(source="product.thumbnail", default=None)
    commission_rate = serializers.DecimalField(max_digits=5, decimal_places=2)


class CreatorRecommendationRequestSerializer(serializers.ModelSerializer):
    # 크리에이터 대시보드의 "제안 받은 상품" 목록/응답 이력에서 씀(ADR-051) — 벤더가 제안한 커미션율과
    # 어느 상품·벤더인지 같이 보여줘야 크리에이터가 수락 여부를 판단할 수 있다.
    product_id = serializers.IntegerField(source="product.id", read_only=True)
    product_name = serializers.CharField(source="product.name", read_only=True)
    product_thumbnail = serializers.ImageField(source="product.thumbnail", read_only=True, default=None)
    vendor_name = serializers.CharField(source="product.vendor.name", read_only=True)

    class Meta:
        model = CreatorRecommendation
        fields = [
            "id",
            "product_id",
            "product_name",
            "product_thumbnail",
            "vendor_name",
            "commission_rate",
            "status",
            "created_at",
            "responded_at",
        ]
        read_only_fields = fields
