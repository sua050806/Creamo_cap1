from rest_framework.generics import ListAPIView
from rest_framework.permissions import AllowAny

from .models import Category
from .serializers import CategorySerializer


class CategoryListView(ListAPIView):
    permission_classes = [AllowAny]
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
