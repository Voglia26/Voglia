import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CustomerOrder, CustomerOrderCustomStatus, Factory } from "@/lib/types";
import {
  canGenerateCustomerPurchaseOrder,
  customerOrderLeadDays,
  customerOrderStatusLabel,
  isCustomerOrderCancelled,
  isCustomerOrderLocked,
} from "@/lib/types";
import { PageHeader } from "@/components/admin/page-header";
import { CancelCustomerOrderButton } from "@/components/customer-orders/cancel-button";
import { GenerateCpoButton } from "@/components/customer-orders/generate-cpo-button";
import { CopyCpoLink } from "@/components/customer-orders/copy-cpo-link";
import {
  AdminOrderEditor,
  CustomStatusesManager,
} from "@/components/customer-orders/admin-order-editor";
import {
  CustomerOrderStatusBadge,
  RestockBadge,
  UrgentBadge,
} from "@/components/customer-orders/order-badges";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export default async function AdminCustomerOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createAdminClient();
  const [{ data }, { data: factories }, { data: customStatuses }] =
    await Promise.all([
      supabase
        .from("customer_orders")
        .select(
          "*, factory:factories(id, name), seller:app_users(id, display_name, username), cpo:customer_purchase_orders!customer_orders_customer_purchase_order_id_fkey(id, token), custom_status:customer_order_custom_statuses(id, label)"
        )
        .eq("id", id)
        .maybeSingle(),
      supabase.from("factories").select("id, name").order("name"),
      supabase
        .from("customer_order_custom_statuses")
        .select("id, label, active, created_at")
        .order("label"),
    ]);

  if (!data) notFound();

  type Row = CustomerOrder & {
    factory: { id: string; name: string } | { id: string; name: string }[] | null;
    seller:
      | { id: string; display_name: string; username: string }
      | { id: string; display_name: string; username: string }[]
      | null;
    cpo:
      | { id: string; token: string }
      | { id: string; token: string }[]
      | null;
    custom_status:
      | { id: string; label: string }
      | { id: string; label: string }[]
      | null;
  };

  const row = data as unknown as Row;
  const order: CustomerOrder = row;
  const factory = Array.isArray(row.factory)
    ? row.factory[0] ?? null
    : row.factory;
  const seller = Array.isArray(row.seller) ? row.seller[0] ?? null : row.seller;
  const cpo = Array.isArray(row.cpo) ? row.cpo[0] ?? null : row.cpo;
  const customStatus = Array.isArray(row.custom_status)
    ? row.custom_status[0] ?? null
    : row.custom_status;
  const lead = customerOrderLeadDays(order.ordered_at, order.delivered_at);
  const locked = isCustomerOrderLocked(order);
  const cancelled = isCustomerOrderCancelled(order);
  const canGenerate = canGenerateCustomerPurchaseOrder(order);
  const statusLabel = customerOrderStatusLabel({
    ...order,
    custom_status: customStatus,
  });

  const fields: { label: string; value: string }[] = [
    { label: "Vendedora", value: seller?.display_name ?? "—" },
    { label: "Clienta", value: order.customer_name },
    { label: "Producto", value: order.product_name },
    { label: "Notas", value: order.notes?.trim() || "—" },
    {
      label: "Proveedor",
      value: factory?.name ?? "Pendiente de asignar",
    },
    { label: "SKU Lightspeed", value: order.lightspeed_sku?.trim() || "—" },
    { label: "SKU Proveedor", value: order.provider_sku?.trim() || "—" },
    { label: "Color de oro", value: order.gold_color?.trim() || "—" },
    {
      label: "Forma del diamante",
      value: order.diamond_shape?.trim() || "—",
    },
    {
      label: "Tipo de gemstone",
      value: order.gemstone_type?.trim() || "—",
    },
    { label: "Tamaño / talla", value: order.size?.trim() || "—" },
    { label: "Fecha del pedido", value: order.ordered_at.slice(0, 10) },
    {
      label: "Fecha límite",
      value: order.due_date?.slice(0, 10) ?? "—",
    },
    { label: "Estado", value: statusLabel },
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
    <div>
      <Link
        href="/admin/customer-orders"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Todos los pedidos
      </Link>

      <PageHeader
        eyebrow="Pedido de clienta"
        title={order.product_name}
        description={`${order.customer_name}${factory ? ` · ${factory.name}` : " · Sin proveedor"}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap gap-1.5">
              {order.is_urgent && !cancelled && <UrgentBadge />}
              {order.is_restock && <RestockBadge />}
              <CustomerOrderStatusBadge
                status={order.status}
                customLabel={customStatus?.label}
              />
            </div>
            {!cancelled && (
              <CancelCustomerOrderButton
                orderId={order.id}
                variant="destructive"
              />
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_22rem] gap-6">
        <div
          className={cn(
            "rounded-xl border p-6 space-y-6",
            order.is_restock &&
              !cancelled &&
              "border-amber-300/80 bg-amber-50/30 dark:border-amber-900 dark:bg-amber-950/20",
            cancelled && "border-muted bg-muted/30"
          )}
        >
          {cancelled && (
            <p className="text-sm text-muted-foreground">
              Pedido cancelado — solo lectura. El historial se conserva.
            </p>
          )}
          {order.is_restock && !cancelled && (
            <p className="text-sm text-amber-900 dark:text-amber-200">
              Reposición — excluir de reportes de pago a proveedor.
            </p>
          )}

          {order.photo_url && (
            <Image
              src={order.photo_url}
              alt={order.product_name}
              width={320}
              height={320}
              className={cn(
                "h-48 w-48 object-cover rounded-lg border",
                cancelled && "opacity-70"
              )}
              unoptimized
            />
          )}

          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-sm">
            {fields.map((f) => (
              <div key={f.label}>
                <dt className="text-xs text-muted-foreground uppercase tracking-wide">
                  {f.label}
                </dt>
                <dd
                  className={cn(
                    "mt-1 whitespace-pre-wrap",
                    cancelled && "text-muted-foreground line-through",
                    cancelled &&
                      f.label === "Estado" &&
                      "no-underline font-medium"
                  )}
                >
                  {f.value}
                </dd>
              </div>
            ))}
          </dl>

          {!cancelled && (
            <div className="border-t pt-4 space-y-3">
              {canGenerate ? (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Genera el link único para enviar a{" "}
                    {factory?.name ?? "el proveedor"}.
                  </p>
                  <GenerateCpoButton
                    orderId={order.id}
                    isRestock={order.is_restock}
                    size="default"
                  />
                </div>
              ) : cpo?.token ? (
                <CopyCpoLink token={cpo.token} isRestock={order.is_restock} />
              ) : locked ? (
                <p className="text-sm text-muted-foreground">
                  Purchase Order asociada, pero no se encontró el token.
                </p>
              ) : !order.factory_id ? (
                <p className="text-sm text-muted-foreground">
                  Asigná un proveedor para poder generar la Purchase Order.
                </p>
              ) : null}
            </div>
          )}

          {cancelled && (
            <p className="text-sm text-muted-foreground border-t pt-4">
              No se generará Purchase Order para un pedido cancelado.
            </p>
          )}
        </div>

        {!cancelled && (
          <div className="space-y-4">
            <AdminOrderEditor
              order={order}
              factories={(factories ?? []) as Pick<Factory, "id" | "name">[]}
              customStatuses={
                (customStatuses ?? []) as CustomerOrderCustomStatus[]
              }
            />
            <CustomStatusesManager
              statuses={(customStatuses ?? []) as CustomerOrderCustomStatus[]}
            />
          </div>
        )}
      </div>
    </div>
  );
}
