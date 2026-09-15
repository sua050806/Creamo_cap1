from django.urls import path

from .views import PaymentCompleteView

urlpatterns = [
    path("payments/complete", PaymentCompleteView.as_view()),
]
