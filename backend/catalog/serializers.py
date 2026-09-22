from rest_framework import serializers

from recommendations.models import CreatorRecommendation

from .models import Category, Product


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "name", "parent_id"]


class ProductListSerializer(serializers.ModelSerializer):
    # 신상품 슬라이드 등에서 "이 상품을 추천하는 크리에이터"를 같이 보여주기 위해 상세 화면과
    # 동일한 필드를 목록에도 추가함(구현하면서 화면에 맞게 보강한 사례).
    recommended_by = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = ["id", "name", "price", "thumbnail", "status", "recommended_by"]

    def get_recommended_by(self, product):
        # accepted만 — pending(벤더가 제안만 하고 크리에이터가 아직 수락 안 함)은 공개 화면에
        # 노출되면 안 됨(ADR-051 참고).
        recommendations = CreatorRecommendation.objects.filter(
            product=product, status=CreatorRecommendation.Status.ACCEPTED
        ).select_related("creator")
        return [
            {"creator_id": rec.creator_id, "handle": rec.creator.handle} for rec in recommendations
        ]


class ProductVendorSerializer(serializers.Serializer):
    name = serializers.CharField()


class ProductDetailSerializer(serializers.ModelSerializer):
    vendor = ProductVendorSerializer(read_only=True)
    recommended_by = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            "id",
            "name",
            "short_description",
            "description",
            "price",
            "commission_rate",
            "thumbnail",
            "options",
            "stock",
            "status",
            "vendor",
            "recommended_by",
        ]

    def get_recommended_by(self, product):
        recommendations = CreatorRecommendation.objects.filter(
            product=product, status=CreatorRecommendation.Status.ACCEPTED
        ).select_related("creator")
        return [
            {"creator_id": rec.creator_id, "handle": rec.creator.handle} for rec in recommendations
        ]
