# 관리자 콘솔의 "정산 승인" 화면을 실제로 테스트해볼 수 있도록 데모 정산 대상 2건(벤더 1 + 크리에이터 1)을
# 만들어둔다. 실제로는 Celery 배치가 주기적으로 계산해서 만들어두는 값이지만(4주차 스코프), 그 전까지는
# 이 seed 데이터로 승인 API를 확인한다.

from datetime import date

from django.db import migrations


def seed_settlements(apps, schema_editor):
    VendorProfile = apps.get_model("vendors", "VendorProfile")
    CreatorProfile = apps.get_model("accounts", "CreatorProfile")
    Settlement = apps.get_model("settlements", "Settlement")

    vendor = VendorProfile.objects.filter(name="OO전자").first()
    creator = CreatorProfile.objects.filter(handle="kim-creator").first()

    period_start = date(2026, 8, 1)
    period_end = date(2026, 8, 31)

    if vendor and not Settlement.objects.filter(target_type="vendor", target_id=vendor.id).exists():
        Settlement.objects.create(
            target_type="vendor",
            target_id=vendor.id,
            amount=520000,
            period_start=period_start,
            period_end=period_end,
            status="pending",
        )

    if creator and not Settlement.objects.filter(target_type="creator", target_id=creator.id).exists():
        Settlement.objects.create(
            target_type="creator",
            target_id=creator.id,
            amount=39000,
            period_start=period_start,
            period_end=period_end,
            status="pending",
        )


def unseed_settlements(apps, schema_editor):
    Settlement = apps.get_model("settlements", "Settlement")
    Settlement.objects.filter(period_start=date(2026, 8, 1), period_end=date(2026, 8, 31)).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("settlements", "0001_initial"),
        ("catalog", "0005_lengthen_descriptions"),
        ("accounts", "0003_promote_dev_admin"),
    ]

    operations = [
        migrations.RunPython(seed_settlements, unseed_settlements),
    ]
