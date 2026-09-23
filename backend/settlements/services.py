from django.db import transaction
from django.utils import timezone

from orders.models import OrderItem

from .models import Settlement


def generate_settlements(vendor=None):
    """배송완료(delivered)된 주문 항목 중 아직 어떤 정산에도 포함되지 않은 것(settled_at이 비어있는
    것)을 대상으로 크리에이터·벤더별 정산을 만든다. `AdminSettlementGenerateView`(전체 일괄)와
    `VendorSettlementGenerateView`(본인 몫만, ADR-053)가 공유하는 로직 — `vendor`를 넘기면 그 벤더의
    상품이 포함된 주문 항목으로만 범위를 좁힌다(그 항목에 딸린 크리에이터 커미션도 같이 계산됨,
    벤더-크리에이터 몫이 같은 주문 항목에서 나오는 한 쌍이라 분리해서 계산할 수 없음).

    실제 돈은 플랫폼(크리에모)의 결제 계좌 하나로만 들어오고(PORTONE_STORE_ID가 전역 설정 하나뿐)
    벤더·크리에이터는 그 돈에 직접 접근할 방법이 없어서, "정산 생성"은 어느 쪽이 트리거하든 실제
    주문 데이터로 금액을 계산해두는 것일 뿐이고 실제 지급(승인)은 여전히 관리자만 할 수 있다
    (`AdminSettlementsView.post`)."""

    with transaction.atomic():
        items_qs = OrderItem.objects.select_for_update().filter(
            status=OrderItem.Status.DELIVERED, settled_at__isnull=True
        )
        if vendor is not None:
            items_qs = items_qs.filter(product__vendor=vendor)
        items = list(items_qs.select_related("order", "product"))
        if not items:
            return []

        period_start = min(item.order.created_at for item in items).date()
        period_end = timezone.now().date()
        now = timezone.now()

        created = []

        creator_totals = {}
        for item in items:
            if item.creator_id is None:
                continue
            creator_totals[item.creator_id] = creator_totals.get(item.creator_id, 0) + item.commission_amount
        for creator_id, amount in creator_totals.items():
            if amount <= 0:
                continue
            created.append(
                Settlement.objects.create(
                    target_type=Settlement.TargetType.CREATOR,
                    target_id=creator_id,
                    amount=amount,
                    period_start=period_start,
                    period_end=period_end,
                )
            )

        vendor_totals = {}
        for item in items:
            vendor_id = item.product.vendor_id
            revenue = item.unit_price * item.quantity - item.commission_amount
            vendor_totals[vendor_id] = vendor_totals.get(vendor_id, 0) + revenue
        for vendor_id, amount in vendor_totals.items():
            if amount <= 0:
                continue
            created.append(
                Settlement.objects.create(
                    target_type=Settlement.TargetType.VENDOR,
                    target_id=vendor_id,
                    amount=amount,
                    period_start=period_start,
                    period_end=period_end,
                )
            )

        OrderItem.objects.filter(id__in=[item.id for item in items]).update(settled_at=now)

    return created
