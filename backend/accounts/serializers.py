from rest_framework import serializers

from catalog.models import Category

from .models import CreatorProfile, User


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
        if value not in (User.Role.BUYER, User.Role.CREATOR):
            raise serializers.ValidationError("가입 시 선택할 수 있는 역할은 구매자 또는 크리에이터입니다.")
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


class CreatorRecommendationProductSerializer(serializers.Serializer):
    # CreatorRecommendation을 상품 목록처럼 보여준다 — commission_rate는 이 크리에이터에게
    # 적용되는 값(ADR-012, 개별 조정 가능)이라 Product.commission_rate가 아니라 여기서 가져온다.
    id = serializers.IntegerField(source="product.id")
    name = serializers.CharField(source="product.name")
    price = serializers.IntegerField(source="product.price")
    commission_rate = serializers.DecimalField(max_digits=5, decimal_places=2)
