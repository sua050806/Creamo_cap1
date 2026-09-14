from rest_framework.generics import ListAPIView, RetrieveAPIView
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import AllowAny

from vendors.models import VendorProfile

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
        # 판매 중단된 벤더의 상품은 목록에서 완전히 숨긴다 → ADR-030 참고.
        queryset = Product.objects.filter(
            status=Product.Status.SELLING, vendor__status=VendorProfile.Status.ACTIVE
        )

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
    # 상세 페이지 직접 접근(URL 공유 등)도 막아야 하므로 목록과 동일하게 벤더 판매 중단 여부를 반영.
    queryset = Product.objects.filter(vendor__status=VendorProfile.Status.ACTIVE)
    serializer_class = ProductDetailSerializer
