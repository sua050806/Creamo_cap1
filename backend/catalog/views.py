from rest_framework.generics import ListAPIView, RetrieveAPIView
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import AllowAny

from .models import Category, Product
from .serializers import CategorySerializer, ProductDetailSerializer, ProductListSerializer


class CategoryListView(ListAPIView):
    permission_classes = [AllowAny]
    queryset = Category.objects.all()
    serializer_class = CategorySerializer


class ProductPagination(PageNumberPagination):
    page_size = 20


class ProductListView(ListAPIView):
    permission_classes = [AllowAny]
    serializer_class = ProductListSerializer
    pagination_class = ProductPagination

    def get_queryset(self):
        queryset = Product.objects.filter(status=Product.Status.SELLING)

        category_id = self.request.query_params.get("category")
        if category_id:
            queryset = queryset.filter(category_id=category_id)

        creator_id = self.request.query_params.get("creator")
        if creator_id:
            queryset = queryset.filter(recommendations__creator_id=creator_id).distinct()

        query = self.request.query_params.get("q")
        if query:
            queryset = queryset.filter(name__icontains=query)

        return queryset


class ProductDetailView(RetrieveAPIView):
    permission_classes = [AllowAny]
    queryset = Product.objects.all()
    serializer_class = ProductDetailSerializer
