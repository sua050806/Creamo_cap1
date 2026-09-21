from django.core.management.base import BaseCommand

from accounts.models import User
from vendors.models import VendorProfile

# 관리자가 오프라인 정보로 대신 등록해서 로그인 계정이 없는 레거시 벤더들에게, 벤더가 본인 계정으로
# 직접 상품·정산을 관리하게 된 이후(ADR-043)에도 로그인할 수 있게 일괄로 계정을 만들어 붙여준다.
# 실제 이메일이 없는 데이터라 email/password는 데모용으로 예측 가능한 값을 씀 — 발표 때 이 값
# 그대로 로그인해서 보여주면 됨. 한 번 계정이 연결된 벤더는(user가 이미 있으면) 건너뛰어서 여러 번
# 실행해도 안전하다.
DEFAULT_PASSWORD = "vendor1234"


class Command(BaseCommand):
    help = "계정이 없는 레거시 벤더(VendorProfile.user=null)에게 로그인 계정을 일괄로 만들어 연결합니다."

    def handle(self, *args, **options):
        legacy_vendors = VendorProfile.objects.filter(user__isnull=True).order_by("id")
        if not legacy_vendors:
            self.stdout.write("계정이 없는 벤더가 없습니다.")
            return

        created = []
        for vendor in legacy_vendors:
            email = f"vendor{vendor.id}@creamo.local"
            user = User(username=email, email=email, name=vendor.name, role=User.Role.VENDOR)
            user.set_password(DEFAULT_PASSWORD)
            user.save()
            vendor.user = user
            vendor.save(update_fields=["user"])
            created.append((vendor.name, email))

        self.stdout.write(self.style.SUCCESS(f"{len(created)}개 벤더에 계정을 생성했습니다:"))
        for name, email in created:
            self.stdout.write(f"  {name} → {email} / {DEFAULT_PASSWORD}")
