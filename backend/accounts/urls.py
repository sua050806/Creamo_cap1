from django.urls import path

from .views import CreatorProfileCreateView, CsrfView, LoginView, LogoutView, MeView, SignupView

urlpatterns = [
    path("auth/csrf", CsrfView.as_view()),
    path("auth/signup", SignupView.as_view()),
    path("auth/login", LoginView.as_view()),
    path("auth/logout", LogoutView.as_view()),
    path("auth/me", MeView.as_view()),
    path("creator/profile", CreatorProfileCreateView.as_view()),
]
