from rest_framework import serializers

from accounts.models import CreatorProfile
from catalog.models import Product

from .models import Cart, CartItem


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
