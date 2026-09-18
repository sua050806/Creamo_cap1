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
from django.contrib import admin
from django.urls import include, path, re_path
from django.views.static import serve

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
# (docs의 AWS 배포 가이드 5번 참고), DEBUG 여부와 무관하게 항상 켜져 있어야 한다.
# django.conf.urls.static의 static() 헬퍼는 안 쓴다 — Django 5.2 기준 그 함수는 DEBUG=False면
# 옵션(insecure= 같은 것도 이제 없음) 없이 무조건 빈 리스트를 반환해버려서, DEBUG=False에서 절대
# 미디어를 못 켬(실제로 배포해서 두 번이나 404 겪고서야 발견 — static() 소스를 직접 열어봐야 알 수
# 있는 내용이었음). 그래서 그 헬퍼가 내부적으로 쓰는 django.views.static.serve 뷰를 직접 등록한다 —
# 이러면 DEBUG 체크를 아예 안 거치므로 항상 서빙된다.
urlpatterns += [
    re_path(r'^media/(?P<path>.*)$', serve, {'document_root': settings.MEDIA_ROOT}),
]
