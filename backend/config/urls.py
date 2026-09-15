"""
URL configuration for config project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    # 프론트엔드가 우리 관리자 콘솔 API를 /admin/...으로 쓰기로 스펙에 정해둬서(api-spec.md),
    # Django 자체 관리자 사이트는 경로 충돌을 피하기 위해 /django-admin/으로 옮긴다.
    path('django-admin/', admin.site.urls),
    path('', include('accounts.urls')),
    path('', include('catalog.urls')),
    path('', include('adminconsole.urls')),
    path('', include('orders.urls')),
    path('', include('payments.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
