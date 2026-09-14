from django.urls import path

from .views import (
    CreatorDashboardProductsView,
    CreatorDashboardStatsView,
    CreatorDetailView,
    CreatorListView,
    CreatorProductsView,
    CreatorProfileCreateView,
    CsrfView,
    LoginView,
    LogoutView,
    MeView,
    SignupView,
)

urlpatterns = [
    path("auth/csrf", CsrfView.as_view()),
    path("auth/signup", SignupView.as_view()),
    path("auth/login", LoginView.as_view()),
    path("auth/logout", LogoutView.as_view()),
    path("auth/me", MeView.as_view()),
    path("creator/profile", CreatorProfileCreateView.as_view()),
    path("creator/dashboard/stats", CreatorDashboardStatsView.as_view()),
    path("creator/dashboard/products", CreatorDashboardProductsView.as_view()),
    path("creators", CreatorListView.as_view()),
    path("creators/<int:pk>", CreatorDetailView.as_view()),
    path("creators/<int:pk>/products", CreatorProductsView.as_view()),
]
