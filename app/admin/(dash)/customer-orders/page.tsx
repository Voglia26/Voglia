import { Suspense } from "react";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CustomerOrder } from "@/lib/types";
import { PageHeader } from "@/components/admin/page-header";
import { AdminCustomerOrderRow } from "@/components/customer-orders/order-badges";
import { CustomerOrderFilters } from "@/components/customer-orders/admin-filters";

export default async function AdminCustomerOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{
    seller_id?: string;
    factory_id?: string;
    status?: string;
    urgent?: string;
    restock?: string;
    cancelled?: string;
  }>;
}) {
  const params = await searchParams;
  const supabase = createAdminClient();

  let query = supabase
    .from("customer_orders")
    .select(
      "*, factory:factories(id, name), seller:app_users(id, display_name), cpo:customer_purchase_orders!customer_orders_customer_purchase_order_id_fkey(id, token), custom_status:customer_order_custom_statuses(id, label)"
    )
    .order("ordered_at", { ascending: false })
    .order("created_at", { ascending: false });

  if (params.seller_id) query = query.eq("seller_id", params.seller_id);
  if (params.factory_id) query = query.eq("factory_id", params.factory_id);
  if (params.status?.startsWith("custom:")) {
    query = query.eq("custom_status_id", params.status.slice("custom:".length));
  } else if (params.status) {
    query = query.eq("status", params.status).is("custom_status_id", null);
  }
  if (params.urgent === "1") query = query.eq("is_urgent", true);
  if (params.urgent === "0") query = query.eq("is_urgent", false);
  if (params.restock === "1") query = query.eq("is_restock", true);
  if (params.restock === "0") query = query.eq("is_restock", false);
  if (params.cancelled === "hide") query = query.neq("status", "cancelled");
  if (params.cancelled === "only") query = query.eq("status", "cancelled");

  const [ordersRes, sellersRes, factoriesRes, customRes] = await Promise.all([
    query,
    supabase
      .from("app_users")
      .select("id, display_name")
      .eq("role", "seller")
      .eq("active", true)
      .order("display_name"),
    supabase.from("factories").select("id, name").order("name"),
    supabase
      .from("customer_order_custom_statuses")
      .select("id, label")
      .eq("active", true)
      .order("label"),
  ]);

  type Row = CustomerOrder & {
    factory: { id: string; name: string } | { id: string; name: string }[] | null;
    seller:
      | { id: string; display_name: string }
      | { id: string; display_name: string }[]
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

  const orders = ((ordersRes.data ?? []) as unknown as Row[]).map((row) => ({
    ...row,
    factory: Array.isArray(row.factory) ? row.factory[0] ?? null : row.factory,
    seller: Array.isArray(row.seller) ? row.seller[0] ?? null : row.seller,
    cpo: Array.isArray(row.cpo) ? row.cpo[0] ?? null : row.cpo,
    custom_status: Array.isArray(row.custom_status)
      ? row.custom_status[0] ?? null
      : row.custom_status,
  }));

  return (
    <div>
      <PageHeader
        eyebrow="Retail"
        title="Pedidos de clientas"
        description="Asigná proveedor y estado, generá el link de Purchase Order y enviálo al proveedor. Las reposiciones se marcan en ámbar."
      />

      <div className="mb-6">
        <Suspense fallback={null}>
          <CustomerOrderFilters
            sellers={sellersRes.data ?? []}
            factories={factoriesRes.data ?? []}
            customStatuses={customRes.data ?? []}
          />
        </Suspense>
      </div>

      {orders.length === 0 ? (
        <p className="text-sm text-muted-foreground border rounded-lg p-6">
          No hay pedidos con estos filtros.{" "}
          <Link href="/admin/customer-orders" className="underline">
            Ver todos
          </Link>
        </p>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <AdminCustomerOrderRow key={order.id} order={order} />
          ))}
        </div>
      )}
    </div>
  );
}
