import Link from "next/link";
import {
  CUSTOMER_ORDER_STATUS_LABELS,
  canGenerateCustomerPurchaseOrder,
  customerOrderLeadDays,
  type CustomerOrder,
  type CustomerOrderStatus,
} from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { GenerateCpoButton } from "@/components/customer-orders/generate-cpo-button";
import { CopyCpoLink } from "@/components/customer-orders/copy-cpo-link";

export function CustomerOrderStatusBadge({
  status,
}: {
  status: CustomerOrderStatus;
}) {
  const variant =
    status === "cancelled"
      ? "destructive"
      : status === "delivered"
        ? "default"
        : status === "arrived_panama"
          ? "secondary"
          : "outline";
  return (
    <Badge variant={variant}>{CUSTOMER_ORDER_STATUS_LABELS[status]}</Badge>
  );
}

export function RestockBadge() {
  return (
    <Badge
      variant="outline"
      className="border-amber-600/40 bg-amber-50 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200"
    >
      Reposición
    </Badge>
  );
}

export function UrgentBadge() {
  return <Badge variant="destructive">Urgente</Badge>;
}

export type CustomerOrderListRow = CustomerOrder & {
  factory: { id: string; name: string } | null;
  seller?: { id: string; display_name: string } | null;
  cpo?: { id: string; token: string } | null;
};

function OrderCardBody({
  order,
  showSeller,
}: {
  order: CustomerOrderListRow;
  showSeller?: boolean;
}) {
  const lead = customerOrderLeadDays(order.ordered_at, order.delivered_at);
  const cancelled = order.status === "cancelled";

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p
            className={cn(
              "font-heading text-lg leading-tight truncate",
              cancelled && "line-through text-muted-foreground"
            )}
          >
            {order.product_name}
          </p>
          <p
            className={cn(
              "text-sm text-muted-foreground mt-0.5",
              cancelled && "line-through"
            )}
          >
            {order.customer_name}
            {order.factory?.name ? ` · ${order.factory.name}` : ""}
            {showSeller && order.seller?.display_name
              ? ` · ${order.seller.display_name}`
              : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5 justify-end">
          {order.is_urgent && !cancelled && <UrgentBadge />}
          {order.is_restock && <RestockBadge />}
          <CustomerOrderStatusBadge status={order.status} />
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span>Pedido {order.ordered_at.slice(0, 10)}</span>
        {order.lightspeed_sku && <span>SKU {order.lightspeed_sku}</span>}
        {order.due_date && <span>Límite {order.due_date.slice(0, 10)}</span>}
        {lead !== null && <span>{lead} días hasta entrega</span>}
        {order.customer_purchase_order_id && (
          <span className="text-foreground/80">PO generada</span>
        )}
      </div>
    </>
  );
}

export function CustomerOrderCard({
  order,
  href,
  showSeller,
}: {
  order: CustomerOrderListRow;
  href: string;
  showSeller?: boolean;
}) {
  const cancelled = order.status === "cancelled";

  return (
    <Link
      href={href}
      className={cn(
        "block rounded-xl border p-4 transition-colors hover:bg-muted/40",
        order.is_restock &&
          !cancelled &&
          "border-amber-300/80 bg-amber-50/40 dark:border-amber-900 dark:bg-amber-950/20",
        cancelled && "border-muted bg-muted/30 opacity-80"
      )}
    >
      <OrderCardBody order={order} showSeller={showSeller} />
    </Link>
  );
}

/** Admin list row with Generate PO / copy link (avoids nested interactive elements). */
export function AdminCustomerOrderRow({
  order,
}: {
  order: CustomerOrderListRow;
}) {
  const cancelled = order.status === "cancelled";
  const canGenerate = canGenerateCustomerPurchaseOrder(order);
  const href = `/admin/customer-orders/${order.id}`;

  return (
    <div
      className={cn(
        "rounded-xl border overflow-hidden",
        order.is_restock &&
          !cancelled &&
          "border-amber-300/80 bg-amber-50/40 dark:border-amber-900 dark:bg-amber-950/20",
        cancelled && "border-muted bg-muted/30 opacity-80"
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-stretch">
        <Link
          href={href}
          className="flex-1 min-w-0 p-4 transition-colors hover:bg-muted/30"
        >
          <OrderCardBody order={order} showSeller />
        </Link>
        {!cancelled && (
          <div className="sm:w-56 shrink-0 border-t sm:border-t-0 sm:border-l p-4 flex flex-col justify-center gap-2 bg-background/40">
            {canGenerate ? (
              <>
                {order.is_restock && (
                  <p className="text-[10px] uppercase tracking-wide text-amber-800 dark:text-amber-200">
                    Reposición — no cobro a fábrica
                  </p>
                )}
                <GenerateCpoButton
                  orderId={order.id}
                  isRestock={order.is_restock}
                />
              </>
            ) : order.cpo?.token ? (
              <CopyCpoLink
                token={order.cpo.token}
                isRestock={order.is_restock}
              />
            ) : (
              <p className="text-xs text-muted-foreground">Sin PO</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
