from django.urls import path

from .views import (
    AdminApplicationsView,
    AdminOrderItemsView,
    AdminOrderItemStatusView,
    AdminProductsView,
    AdminSettlementsView,
    AdminVendorsView,
)

urlpatterns = [
    path("admin/applications", AdminApplicationsView.as_view()),
    path("admin/products", AdminProductsView.as_view()),
    path("admin/vendors", AdminVendorsView.as_view()),
    path("admin/order-items", AdminOrderItemsView.as_view()),
    path("admin/order-items/<int:pk>/status", AdminOrderItemStatusView.as_view()),
    path("admin/settlements", AdminSettlementsView.as_view()),
]
