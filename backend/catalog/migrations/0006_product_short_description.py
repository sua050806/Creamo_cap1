# short_description(짧은 한 줄 요약) 필드 추가. 상세 페이지 상단 미리보기에 상세 설명을 그대로
# 잘라서 보여주던 걸 지적받아, 원래 0003_seed_products.py에 있던(0005에서 길게 늘리기 전) 한 줄
# 설명을 그대로 재활용해서 채워 넣는다.

from django.db import migrations, models

SHORT_DESCRIPTIONS = {
    "무선 이어폰": "가볍고 오래 쓰는 무선 이어폰. 한 번 충전으로 최대 8시간 재생.",
    "보조배터리": "얇고 가벼운데 20000mAh, 고속충전 지원.",
    "무선 충전기": "거치형 3in1 무선 충전기, 폰·워치·이어폰 동시 충전.",
    "저자극 선크림": "민감성 피부도 편하게 쓰는 저자극 선크림, SPF50+.",
    "수분크림": "건조한 겨울철에도 촉촉한 고보습 수분크림.",
    "클렌징 오일": "메이크업까지 깔끔하게 지우는 순한 클렌징 오일.",
    "미니 가습기": "책상 위에 딱 맞는 사이즈의 미니 가습기.",
    "극세사 러그": "발이 폭 감기는 극세사 러그, 100x150cm.",
    "무드등": "은은한 분위기를 만들어주는 터치 무드등.",
}


def fill_short_descriptions(apps, schema_editor):
    Product = apps.get_model("catalog", "Product")
    for name, short_description in SHORT_DESCRIPTIONS.items():
        Product.objects.filter(name=name).update(short_description=short_description)


def clear_short_descriptions(apps, schema_editor):
    Product = apps.get_model("catalog", "Product")
    Product.objects.filter(name__in=SHORT_DESCRIPTIONS.keys()).update(short_description="")


class Migration(migrations.Migration):

    dependencies = [
        ("catalog", "0005_lengthen_descriptions"),
    ]

    operations = [
        migrations.AddField(
            model_name="product",
            name="short_description",
            field=models.CharField(blank=True, max_length=100),
        ),
        migrations.RunPython(fill_short_descriptions, clear_short_descriptions),
    ]
