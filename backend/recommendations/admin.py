from django.contrib import admin

from .models import CreatorRecommendation


@admin.register(CreatorRecommendation)
class CreatorRecommendationAdmin(admin.ModelAdmin):
    # 벤더가 지정한 크리에이터를 대리 등록할 때, 크리에이터 검색(존재/승인 여부 확인 겸용)과
    # 연결된 상품의 벤더명을 함께 보여주기 위한 설정 (docs/decisions.md ADR-022 참고)
    list_display = ("creator", "product", "vendor_name", "commission_rate", "created_at")
    search_fields = ("creator__handle", "product__name")
    autocomplete_fields = ("creator", "product")

    @admin.display(description="벤더")
    def vendor_name(self, obj):
        return obj.product.vendor.name
