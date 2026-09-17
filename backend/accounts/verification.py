import secrets

import redis
from django.conf import settings
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


# 프로세스당 커넥션 하나만 만들어서 재사용 — 요청마다 새로 연결할 필요 없음.
_client = redis.Redis(host=settings.REDIS_HOST, port=settings.REDIS_PORT, decode_responses=True)


def send_verification_code(email):
    if _client.exists(_COOLDOWN_KEY.format(email=email)):
        raise VerificationError("잠시 후 다시 시도해주세요. (재발송은 60초마다 가능합니다)")

    code = f"{secrets.randbelow(1_000_000):06d}"
    _client.set(_CODE_KEY.format(email=email), code, ex=CODE_TTL_SECONDS)
    _client.delete(_ATTEMPTS_KEY.format(email=email))
    _client.set(_COOLDOWN_KEY.format(email=email), "1", ex=RESEND_COOLDOWN_SECONDS)

    send_mail(
        subject="[크리모] 이메일 인증번호",
        message=f"인증번호는 {code}입니다. 5분 안에 입력해주세요.",
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[email],
    )


def verify_code(email, code):
    stored = _client.get(_CODE_KEY.format(email=email))
    if stored is None:
        raise VerificationError("인증번호가 없거나 만료됐습니다. 다시 받아주세요.")

    if stored != code:
        attempts_key = _ATTEMPTS_KEY.format(email=email)
        attempts = _client.incr(attempts_key)
        # 코드와 같은 만료 시점을 갖도록 첫 실패 때만 TTL을 맞춰준다(incr는 기존 TTL을 유지함).
        if attempts == 1:
            remaining = _client.ttl(_CODE_KEY.format(email=email))
            _client.expire(attempts_key, remaining if remaining and remaining > 0 else CODE_TTL_SECONDS)
        if attempts >= MAX_ATTEMPTS:
            _client.delete(_CODE_KEY.format(email=email), attempts_key)
            raise VerificationError("인증번호를 너무 많이 틀렸습니다. 다시 받아주세요.")
        raise VerificationError(f"인증번호가 일치하지 않습니다. ({attempts}/{MAX_ATTEMPTS}회)")

    _client.delete(_CODE_KEY.format(email=email), _ATTEMPTS_KEY.format(email=email))
    _client.set(_VERIFIED_KEY.format(email=email), "1", ex=VERIFIED_TTL_SECONDS)


def is_email_verified(email):
    return _client.exists(_VERIFIED_KEY.format(email=email)) > 0


def clear_verification(email):
    _client.delete(_VERIFIED_KEY.format(email=email))
