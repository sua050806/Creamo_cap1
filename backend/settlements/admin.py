from django.contrib import admin

from .models import Settlement


@admin.register(Settlement)
class SettlementAdmin(admin.ModelAdmin):
    list_display = ("target_type", "target_id", "amount", "period_start", "period_end", "status")
    list_filter = ("target_type", "status")
