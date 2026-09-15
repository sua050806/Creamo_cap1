from django.urls import path

from .views import CartItemView, CartView, OrderCancelView, OrderDetailView, OrderListCreateView

urlpatterns = [
    path("cart", CartView.as_view()),
    path("cart/items/<int:pk>", CartItemView.as_view()),
    path("orders", OrderListCreateView.as_view()),
    path("orders/<int:pk>", OrderDetailView.as_view()),
    path("orders/<int:pk>/cancel", OrderCancelView.as_view()),
]
