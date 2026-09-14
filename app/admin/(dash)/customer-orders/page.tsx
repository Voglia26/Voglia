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
      "*, factory:factories(id, name), seller:app_users(id, display_name), cpo:customer_purchase_orders(id, token)"
    )
    .order("ordered_at", { ascending: false })
    .order("created_at", { ascending: false });

  if (params.seller_id) query = query.eq("seller_id", params.seller_id);
  if (params.factory_id) query = query.eq("factory_id", params.factory_id);
  if (params.status) query = query.eq("status", params.status);
  if (params.urgent === "1") query = query.eq("is_urgent", true);
  if (params.urgent === "0") query = query.eq("is_urgent", false);
  if (params.restock === "1") query = query.eq("is_restock", true);
  if (params.restock === "0") query = query.eq("is_restock", false);
  if (params.cancelled === "hide") query = query.neq("status", "cancelled");
  if (params.cancelled === "only") query = query.eq("status", "cancelled");

  const [ordersRes, sellersRes, factoriesRes] = await Promise.all([
    query,
    supabase
      .from("app_users")
      .select("id, display_name")
      .eq("role", "seller")
      .eq("active", true)
      .order("display_name"),
    supabase.from("factories").select("id, name").order("name"),
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
  };

  const orders = ((ordersRes.data ?? []) as unknown as Row[]).map((row) => ({
    ...row,
    factory: Array.isArray(row.factory) ? row.factory[0] ?? null : row.factory,
    seller: Array.isArray(row.seller) ? row.seller[0] ?? null : row.seller,
    cpo: Array.isArray(row.cpo) ? row.cpo[0] ?? null : row.cpo,
  }));

  return (
    <div>
      <PageHeader
        eyebrow="Retail"
        title="Pedidos de clientas"
        description="Genera el link de Purchase Order por pedido y envíalo al proveedor. Las reposiciones se marcan en ámbar."
      />

      <div className="mb-6">
        <Suspense fallback={null}>
          <CustomerOrderFilters
            sellers={sellersRes.data ?? []}
            factories={factoriesRes.data ?? []}
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
