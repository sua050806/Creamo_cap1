from django.db import transaction
from django.utils import timezone
from rest_framework import status as http_status
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from orders.models import Order, OrderItem

from .models import Payment
from .portone import PortOneError, get_payment


class PaymentCompleteView(APIView):
    """프론트가 포트원 결제창에서 성공 결과를 받은 뒤 호출. 프론트 말을 그대로 믿지 않고 서버가
    포트원에 직접 재조회해서 실제 결제 상태·금액을 확인한 다음에만 주문을 결제완료로 처리한다
    → ADR-036 참고. 문서(api-spec.md)의 POST /payments/request 설계는 V1(구 아임포트) 방식이라
    V2 SDK 흐름에 맞게 이 엔드포인트로 대체함."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        order_id = request.data.get("order_id")
        payment_id = request.data.get("payment_id")
        if not order_id or not payment_id:
            raise ValidationError({"error": "order_id와 payment_id가 모두 필요합니다."})

        order = Order.objects.filter(id=order_id, buyer=request.user).prefetch_related("items").first()
        if order is None:
            return Response({"error": "주문을 찾을 수 없습니다."}, status=http_status.HTTP_404_NOT_FOUND)

        # 이미 처리된 결제면(중복 호출 등) 그대로 성공 응답만 다시 돌려준다.
        if Payment.objects.filter(order=order, status=Payment.Status.COMPLETED).exists():
            return Response({"order_id": order.id, "status": "paid"})

        try:
            remote = get_payment(payment_id)
        except PortOneError as exc:
            return Response({"error": str(exc)}, status=http_status.HTTP_502_BAD_GATEWAY)

        remote_status = remote.get("status")
        remote_amount = (remote.get("amount") or {}).get("total")
        method_info = remote.get("method")
        method_type = method_info.get("type") if isinstance(method_info, dict) else "unknown"

        if remote_status != "PAID" or remote_amount != order.total_amount:
            Payment.objects.create(
                order=order, pg_transaction_id=payment_id, method=method_type or "unknown",
                status=Payment.Status.FAILED,
            )
            return Response(
                {"error": "결제 확인에 실패했습니다. 결제 상태 또는 금액이 일치하지 않습니다."},
                status=http_status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            Payment.objects.create(
                order=order,
                pg_transaction_id=payment_id,
                method=method_type or "unknown",
                status=Payment.Status.COMPLETED,
                paid_at=timezone.now(),
            )
            order.items.filter(status=OrderItem.Status.PENDING).update(status=OrderItem.Status.PAID)

        return Response({"order_id": order.id, "status": "paid"})
