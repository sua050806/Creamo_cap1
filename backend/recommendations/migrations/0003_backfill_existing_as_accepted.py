from django.db import migrations
from django.utils import timezone


def mark_existing_as_accepted(apps, schema_editor):
    # 0002가 새 status 필드에 기본값 pending을 넣었는데, 그건 "새로 벤더가 제안한 것"에나 맞는 값이고
    # 이 시점에 이미 있던 행들은 전부 실제로 활성 중인(공개 노출·커미션 대상) 추천이었다 — 이 마이그레이션
    # 없이 그냥 두면 기존 추천이 전부 "제안 대기중"으로 취급되어 상품 목록·커미션 계산에서 사라진다.
    CreatorRecommendation = apps.get_model("recommendations", "CreatorRecommendation")
    CreatorRecommendation.objects.filter(status="pending").update(
        status="accepted", responded_at=timezone.now()
    )


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("recommendations", "0002_creatorrecommendation_responded_at_and_more"),
    ]

    operations = [
        migrations.RunPython(mark_existing_as_accepted, noop_reverse),
    ]
