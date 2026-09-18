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

# 이 프로젝트는 nginx 같은 별도 웹서버 없이 Django 컨테이너가 직접 미디어 파일을 서빙하는 구조라서
# (docs의 AWS 배포 가이드 5번 참고), DEBUG 여부와 무관하게 항상 켜져 있어야 한다. DEBUG=True일 때만
# 서빙하던 이전 코드는 배포 시 DEBUG=False로 바꾸는 순간 업로드한 상품 이미지가 전부 404 나는 원인이었음
# (배포해서 실제로 이미지 올려보다가 발견) → 트래픽이 많지 않은 이번 규모(캡스톤 발표용)에서는 이 방식이
# django.contrib.staticfiles의 static() 성능 경고보다 "nginx 없이 간단하게" 쪽을 택하는 게 맞다고 판단.
urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
