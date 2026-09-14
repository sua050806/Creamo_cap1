from django.db import models


class VendorProfile(models.Model):
    class Status(models.TextChoices):
        # 벤더는 로그인 계정이 없어 "심사 대기" 상태가 성립하지 않는다(ADR-028) — 관리자가 등록하는
        # 시점에 이미 활성 상태로 시작하고, 이후 필요하면 관리자가 판매 중단으로 전환한다.
        ACTIVE = "active", "활성"
        SUSPENDED = "suspended", "판매중단"

    name = models.CharField(max_length=100)
    business_no = models.CharField(max_length=20)
    contact = models.CharField(max_length=100)
    settlement_account = models.CharField(max_length=100)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.ACTIVE)

    def __str__(self):
        return self.name
