from django.conf import settings
from django.db import models


class VendorProfile(models.Model):
    class Status(models.TextChoices):
        # 원래는 벤더가 로그인 계정이 없어 "심사 대기"가 성립하지 않았지만(ADR-028), 벤더도 본인
        # 계정으로 가입·신청하게 되면서(ADR-043) 크리에이터와 같은 승인 흐름이 다시 필요해짐 —
        # PENDING/REJECTED를 되살림. 관리자가 예전처럼 대신 등록하는 벤더(user 없음)는 여전히
        # 신청 절차 없이 바로 ACTIVE로 시작(뷰에서 직접 지정, 모델 기본값과 무관).
        PENDING = "pending", "승인대기"
        ACTIVE = "active", "활성"
        SUSPENDED = "suspended", "판매중단"
        REJECTED = "rejected", "반려"

    # null 허용 — 관리자가 오프라인 정보로 대신 등록한 레거시 벤더는 계정이 없을 수 있다(ADR-043
    # 이전부터 있던 데이터, 일괄 계정 생성 스크립트로 연결 전까지 null로 남음).
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="vendor_profile", null=True, blank=True
    )
    name = models.CharField(max_length=100)
    business_no = models.CharField(max_length=20)
    contact = models.CharField(max_length=100)
    settlement_account = models.CharField(max_length=100)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.ACTIVE)
    applied_at = models.DateTimeField(null=True, blank=True)
    approved_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return self.name
