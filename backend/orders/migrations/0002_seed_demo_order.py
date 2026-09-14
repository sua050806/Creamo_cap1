# 관리자 콘솔의 "배송 상태 변경" 화면을 실제로 테스트해볼 수 있도록 데모 주문 1건을 만들어둔다.
# 주문/결제 생성 API 자체는 아직 구현 전이라(4주차 스코프), 그 전까지는 이 seed 데이터로 확인한다.

from django.contrib.auth.hashers import make_password
from django.db import migrations


def seed_order(apps, schema_editor):
    User = apps.get_model("accounts", "User")
    CreatorProfile = apps.get_model("accounts", "CreatorProfile")
    Product = apps.get_model("catalog", "Product")
    Order = apps.get_model("orders", "Order")
    OrderItem = apps.get_model("orders", "OrderItem")

    buyer, created = User.objects.get_or_create(
        email="buyer-demo@example.com",
        defaults={
            "username": "buyer-demo@example.com",
            "name": "데모 구매자",
            "role": "buyer",
            "password": make_password("demo12345"),
        },
    )

    try:
        earphone = Product.objects.get(name="무선 이어폰")
        cream = Product.objects.get(name="수분크림")
    except Product.DoesNotExist:
        return

    if Order.objects.filter(buyer=buyer).exists():
        return

    creator = CreatorProfile.objects.filter(handle="kim-creator").first()

    order = Order.objects.create(buyer=buyer, total_amount=earphone.price + cream.price * 2)
    OrderItem.objects.create(
        order=order,
        product=earphone,
        creator=creator,
        quantity=1,
        unit_price=earphone.price,
        commission_amount=int(earphone.price * earphone.commission_rate / 100),
        status="preparing",
    )
    OrderItem.objects.create(
        order=order,
        product=cream,
        creator=None,
        quantity=2,
        unit_price=cream.price,
        commission_amount=0,
        status="shipping",
    )


def unseed_order(apps, schema_editor):
    User = apps.get_model("accounts", "User")
    Order = apps.get_model("orders", "Order")
    Order.objects.filter(buyer__email="buyer-demo@example.com").delete()
    User.objects.filter(email="buyer-demo@example.com").delete()


class Migration(migrations.Migration):

    dependencies = [
        ("orders", "0001_initial"),
        ("catalog", "0005_lengthen_descriptions"),
        ("accounts", "0003_promote_dev_admin"),
    ]

    operations = [
        migrations.RunPython(seed_order, unseed_order),
    ]
