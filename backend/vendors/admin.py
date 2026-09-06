from django.contrib import admin

from .models import VendorProfile


@admin.register(VendorProfile)
class VendorProfileAdmin(admin.ModelAdmin):
    list_display = ("name", "business_no", "contact", "status")
    list_filter = ("status",)
    search_fields = ("name", "business_no")
