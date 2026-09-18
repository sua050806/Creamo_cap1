from django.urls import path

from .views import (
    AdminApplicationsView,
    AdminOrderItemsView,
    AdminOrderItemStatusView,
    AdminProductDetailView,
    AdminProductRecommendationsView,
    AdminProductsView,
    AdminProductStatusView,
    AdminSettlementGenerateView,
    AdminSettlementsView,
    AdminUserRoleView,
    AdminUsersView,
    AdminVendorsView,
    AdminVendorStatusView,
)

urlpatterns = [
    path("admin/applications", AdminApplicationsView.as_view()),
    path("admin/products", AdminProductsView.as_view()),
    path("admin/products/<int:pk>", AdminProductDetailView.as_view()),
    path("admin/products/<int:pk>/status", AdminProductStatusView.as_view()),
    path("admin/products/<int:pk>/recommendations", AdminProductRecommendationsView.as_view()),
    path(
        "admin/products/<int:pk>/recommendations/<int:creator_id>",
        AdminProductRecommendationsView.as_view(),
    ),
    path("admin/vendors", AdminVendorsView.as_view()),
    path("admin/vendors/<int:pk>/status", AdminVendorStatusView.as_view()),
    path("admin/users", AdminUsersView.as_view()),
    path("admin/users/<int:pk>/role", AdminUserRoleView.as_view()),
    path("admin/order-items", AdminOrderItemsView.as_view()),
    path("admin/order-items/<int:pk>/status", AdminOrderItemStatusView.as_view()),
    path("admin/settlements", AdminSettlementsView.as_view()),
    path("admin/settlements/generate", AdminSettlementGenerateView.as_view()),
]
