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
