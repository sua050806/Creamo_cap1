from rest_framework import serializers

from recommendations.models import CreatorRecommendation

from .models import Category, Product


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "name", "parent_id"]


class ProductListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = ["id", "name", "price", "thumbnail", "status"]


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
        recommendations = CreatorRecommendation.objects.filter(product=product).select_related("creator")
        return [
            {"creator_id": rec.creator_id, "handle": rec.creator.handle} for rec in recommendations
        ]
