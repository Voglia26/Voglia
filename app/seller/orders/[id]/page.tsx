import Link from "next/link";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSession } from "@/lib/auth";
import { updateCustomerOrder } from "@/app/seller/actions";
import type { CustomerOrder, Factory } from "@/lib/types";
import {
  CUSTOMER_ORDER_STATUS_LABELS,
  customerOrderLeadDays,
  isCustomerOrderCancelled,
  isCustomerOrderLocked,
} from "@/lib/types";
import { CustomerOrderForm } from "@/components/customer-orders/order-form";
import {
  CustomerOrderStatusBadge,
  RestockBadge,
  UrgentBadge,
} from "@/components/customer-orders/order-badges";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

function CancelledReadOnly({
  order,
  factoryName,
}: {
  order: CustomerOrder;
  factoryName: string | null;
}) {
  const lead = customerOrderLeadDays(order.ordered_at, order.delivered_at);
  const fields: { label: string; value: string }[] = [
    { label: "Clienta", value: order.customer_name },
    { label: "Producto", value: order.product_name },
    { label: "Notas", value: order.notes?.trim() || "—" },
    { label: "Proveedor", value: factoryName ?? "—" },
    { label: "SKU Lightspeed", value: order.lightspeed_sku?.trim() || "—" },
    { label: "Fecha del pedido", value: order.ordered_at.slice(0, 10) },
    { label: "Fecha límite", value: order.due_date?.slice(0, 10) ?? "—" },
    {
      label: "Estado",
      value: CUSTOMER_ORDER_STATUS_LABELS[order.status],
    },
    {
      label: "Llegó a Panamá",
      value: order.arrived_panama_at?.slice(0, 10) ?? "—",
    },
    {
      label: "Entregado a clienta",
      value: order.delivered_at?.slice(0, 10) ?? "—",
    },
    {
      label: "Tiempo pedido → entrega",
      value: lead !== null ? `${lead} días` : "—",
    },
  ];

  return (
    <div className="rounded-xl border border-muted bg-muted/30 p-6 space-y-6 max-w-xl">
      <p className="text-sm text-muted-foreground">
        Pedido cancelado — solo lectura. El historial se conserva.
      </p>
      {order.photo_url && (
        <Image
          src={order.photo_url}
          alt={order.product_name}
          width={240}
          height={240}
          className="h-40 w-40 object-cover rounded-lg border opacity-70"
          unoptimized
        />
      )}
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-sm">
        {fields.map((f) => (
          <div key={f.label}>
            <dt className="text-xs text-muted-foreground uppercase tracking-wide">
              {f.label}
            </dt>
            <dd className="mt-1 whitespace-pre-wrap text-muted-foreground">
              {f.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export default async function SellerOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session || session.role !== "seller") redirect("/login");

  const { id } = await params;
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("customer_orders")
    .select("*, factory:factories(id, name)")
    .eq("id", id)
    .eq("seller_id", session.id)
    .maybeSingle();

  if (!data) notFound();

  type Row = CustomerOrder & {
    factory: Pick<Factory, "id" | "name"> | Pick<Factory, "id" | "name">[] | null;
  };
  const row = data as unknown as Row;
  const order: CustomerOrder = row;
  const factory = Array.isArray(row.factory)
    ? row.factory[0] ?? null
    : row.factory;

  const { data: factories } = await supabase
    .from("factories")
    .select("id, name")
    .order("name");

  const lead = customerOrderLeadDays(order.ordered_at, order.delivered_at);
  const locked = isCustomerOrderLocked(order);
  const cancelled = isCustomerOrderCancelled(order);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/seller"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Mis pedidos
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <h1
            className={cn(
              "font-heading text-3xl",
              cancelled && "line-through text-muted-foreground"
            )}
          >
            {order.product_name}
          </h1>
          <CustomerOrderStatusBadge status={order.status} />
          {order.is_urgent && !cancelled && <UrgentBadge />}
          {order.is_restock && <RestockBadge />}
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Clienta: {order.customer_name}
          {lead !== null ? ` · ${lead} días pedido → entrega` : ""}
          {locked && !cancelled ? " · PO generada (campos clave bloqueados)" : ""}
        </p>
      </div>

      {cancelled ? (
        <CancelledReadOnly
          order={order}
          factoryName={factory?.name ?? null}
        />
      ) : (
        <CustomerOrderForm
          factories={factories ?? []}
          order={order}
          action={updateCustomerOrder}
          submitLabel="Guardar cambios"
        />
      )}
    </div>
  );
}
