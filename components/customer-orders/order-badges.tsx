import Link from "next/link";
import {
  CUSTOMER_ORDER_STATUS_LABELS,
  customerOrderLeadDays,
  type CustomerOrder,
  type CustomerOrderStatus,
} from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

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
};

export function CustomerOrderCard({
  order,
  href,
  showSeller,
}: {
  order: CustomerOrderListRow;
  href: string;
  showSeller?: boolean;
}) {
  const lead = customerOrderLeadDays(order.ordered_at, order.delivered_at);
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
      </div>
    </Link>
  );
}
