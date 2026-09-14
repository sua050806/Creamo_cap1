from django.urls import path

from .views import CategoryListView, ProductDetailView, ProductListView

urlpatterns = [
    path("categories", CategoryListView.as_view()),
    path("products", ProductListView.as_view()),
    path("products/<int:pk>", ProductDetailView.as_view()),
]
