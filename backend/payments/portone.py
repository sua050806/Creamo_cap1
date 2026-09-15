"""포트원(PortOne) V2 REST API를 호출하는 얇은 래퍼. api-spec.md '결제' 절, ADR-036 참고.

프론트가 "결제 성공했다"고 알려줘도 그대로 믿지 않고, 여기서 포트원 서버에 직접 재조회해서
실제 결제 상태·금액을 확인한다 — 프론트 코드를 조작해서 결제 없이 "성공"으로 위장하는 걸 막기 위함.
"""

import requests
from django.conf import settings

PORTONE_API_BASE = "https://api.portone.io"


class PortOneError(Exception):
    """포트원 API 호출이 실패했을 때(네트워크 오류, 4xx/5xx 응답 등)."""


def _headers():
    return {"Authorization": f"PortOne {settings.PORTONE_API_SECRET}"}


def get_payment(payment_id):
    """결제 단건 조회 — 실제로 결제가 성공했는지, 금액이 맞는지 서버에서 재확인할 때 사용."""
    try:
        response = requests.get(
            f"{PORTONE_API_BASE}/payments/{payment_id}", headers=_headers(), timeout=10
        )
    except requests.RequestException as exc:
        raise PortOneError(f"포트원 결제 조회 요청에 실패했습니다: {exc}") from exc

    if response.status_code >= 400:
        raise PortOneError(f"포트원 결제 조회 실패 ({response.status_code}): {response.text[:300]}")
    return response.json()


def cancel_payment(payment_id, reason, amount=None):
    """결제 취소(환불). amount를 생략하면 전액 취소로 처리."""
    body = {"reason": reason}
    if amount is not None:
        body["amount"] = amount

    try:
        response = requests.post(
            f"{PORTONE_API_BASE}/payments/{payment_id}/cancel",
            headers=_headers(),
            json=body,
            timeout=10,
        )
    except requests.RequestException as exc:
        raise PortOneError(f"포트원 결제 취소 요청에 실패했습니다: {exc}") from exc

    if response.status_code >= 400:
        raise PortOneError(f"포트원 결제 취소 실패 ({response.status_code}): {response.text[:300]}")
    return response.json()
