# 개발용 테스트 계정(admin@example.com, createsuperuser로 만듦)의 role을 admin으로 맞춰준다.
# is_staff/is_superuser와 별개로 우리 서비스 코드는 User.role 필드로 관리자 권한을 판단하기 때문에
# (adminconsole.permissions.IsAdmin 참고) 이 필드도 맞춰야 관리자 콘솔 API를 쓸 수 있다.

from django.db import migrations


def promote(apps, schema_editor):
    User = apps.get_model("accounts", "User")
    User.objects.filter(email="admin@example.com").update(role="admin")


def demote(apps, schema_editor):
    User = apps.get_model("accounts", "User")
    User.objects.filter(email="admin@example.com").update(role="buyer")


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0002_user_name"),
    ]

    operations = [
        migrations.RunPython(promote, demote),
    ]
