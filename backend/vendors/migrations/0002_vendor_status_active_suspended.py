# VendorProfile.status를 승인대기/승인/반려(신청 심사용) → 활성/판매중단(활성화 토글용)으로 의미를
# 바꾼다 → ADR-028/ADR-030 참고. 기존 값 매핑: pending/approved -> active, rejected -> suspended.

from django.db import migrations, models


def migrate_status_values(apps, schema_editor):
    VendorProfile = apps.get_model("vendors", "VendorProfile")
    VendorProfile.objects.filter(status__in=["pending", "approved"]).update(status="active")
    VendorProfile.objects.filter(status="rejected").update(status="suspended")


def revert_status_values(apps, schema_editor):
    VendorProfile = apps.get_model("vendors", "VendorProfile")
    VendorProfile.objects.filter(status="active").update(status="approved")
    VendorProfile.objects.filter(status="suspended").update(status="rejected")


class Migration(migrations.Migration):

    dependencies = [
        ("vendors", "0001_initial"),
        # catalog.0003_seed_products가 벤더를 status="approved"로 만들어두므로, 그 뒤에 실행돼야
        # 변환 대상이 존재한다.
        ("catalog", "0003_seed_products"),
    ]

    operations = [
        migrations.RunPython(migrate_status_values, revert_status_values),
        migrations.AlterField(
            model_name="vendorprofile",
            name="status",
            field=models.CharField(
                choices=[("active", "활성"), ("suspended", "판매중단")],
                default="active",
                max_length=10,
            ),
        ),
    ]
