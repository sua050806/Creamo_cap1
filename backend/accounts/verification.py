import secrets

from django.conf import settings
from django.core.cache import cache
from django.core.mail import send_mail

CODE_TTL_SECONDS = 5 * 60
VERIFIED_TTL_SECONDS = 30 * 60
RESEND_COOLDOWN_SECONDS = 60
MAX_ATTEMPTS = 5

_CODE_KEY = "email_verify_code:{email}"
_ATTEMPTS_KEY = "email_verify_attempts:{email}"
_COOLDOWN_KEY = "email_verify_cooldown:{email}"
_VERIFIED_KEY = "email_verified:{email}"


class VerificationError(Exception):
    """이메일 인증 관련 실패를 표현 — 뷰에서 그대로 사용자에게 보여줄 메시지로 잡아 쓴다."""


def send_verification_code(email):
    cooldown_key = _COOLDOWN_KEY.format(email=email)
    if cache.get(cooldown_key) is not None:
        raise VerificationError("잠시 후 다시 시도해주세요. (재발송은 60초마다 가능합니다)")

    code = f"{secrets.randbelow(1_000_000):06d}"
    cache.set(_CODE_KEY.format(email=email), code, timeout=CODE_TTL_SECONDS)
    cache.delete(_ATTEMPTS_KEY.format(email=email))
    cache.set(cooldown_key, "1", timeout=RESEND_COOLDOWN_SECONDS)

    send_mail(
        subject="[크리모] 이메일 인증번호",
        message=f"인증번호는 {code}입니다. 5분 안에 입력해주세요.",
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[email],
    )


def verify_code(email, code):
    code_key = _CODE_KEY.format(email=email)
    stored = cache.get(code_key)
    if stored is None:
        raise VerificationError("인증번호가 없거나 만료됐습니다. 다시 받아주세요.")

    if stored != code:
        attempts_key = _ATTEMPTS_KEY.format(email=email)
        attempts = cache.get(attempts_key)
        if attempts is None:
            attempts = 0
        attempts = attempts + 1
        cache.set(attempts_key, attempts, timeout=CODE_TTL_SECONDS)
        if attempts >= MAX_ATTEMPTS:
            cache.delete(code_key)
            cache.delete(attempts_key)
            raise VerificationError("인증번호를 너무 많이 틀렸습니다. 다시 받아주세요.")
        raise VerificationError(f"인증번호가 일치하지 않습니다. ({attempts}/{MAX_ATTEMPTS}회)")

    cache.delete(code_key)
    cache.delete(_ATTEMPTS_KEY.format(email=email))
    cache.set(_VERIFIED_KEY.format(email=email), "1", timeout=VERIFIED_TTL_SECONDS)


def is_email_verified(email):
    return cache.get(_VERIFIED_KEY.format(email=email)) is not None


def clear_verification(email):
    cache.delete(_VERIFIED_KEY.format(email=email))
