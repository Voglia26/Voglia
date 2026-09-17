import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSession } from "@/lib/auth";
import type { CustomerOrder } from "@/lib/types";
import { CustomerOrderCard } from "@/components/customer-orders/order-badges";
import { SellerCancelledFilter } from "@/components/customer-orders/seller-cancelled-filter";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default async function SellerHomePage({
  searchParams,
}: {
  searchParams: Promise<{ cancelled?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "seller") {
    redirect(session.role === "admin" ? "/admin/customer-orders" : "/login");
  }

  const params = await searchParams;
  const supabase = createAdminClient();
  let query = supabase
    .from("customer_orders")
    .select(
      "*, factory:factories(id, name), custom_status:customer_order_custom_statuses(id, label)"
    )
    .eq("seller_id", session.id)
    .order("ordered_at", { ascending: false })
    .order("created_at", { ascending: false });

  if (params.cancelled === "hide") {
    query = query.neq("status", "cancelled");
  }

  const { data } = await query;

  type Row = CustomerOrder & {
    factory: { id: string; name: string } | { id: string; name: string }[] | null;
    custom_status:
      | { id: string; label: string }
      | { id: string; label: string }[]
      | null;
  };

  const orders = ((data ?? []) as unknown as Row[]).map((row) => ({
    ...row,
    factory: Array.isArray(row.factory) ? row.factory[0] ?? null : row.factory,
    custom_status: Array.isArray(row.custom_status)
      ? row.custom_status[0] ?? null
      : row.custom_status,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow text-[10px]">Seller</p>
          <h1 className="font-heading text-3xl mt-1">Pedidos de clientas</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Solo ves tus propios pedidos.
          </p>
          <div className="mt-2">
            <Suspense fallback={null}>
              <SellerCancelledFilter />
            </Suspense>
          </div>
        </div>
        <Link href="/seller/orders/new">
          <Button type="button">
            <Plus className="h-4 w-4 mr-2" />
            Nuevo pedido
          </Button>
        </Link>
      </div>

      {orders.length === 0 ? (
        <p className="text-sm text-muted-foreground border rounded-lg p-6">
          Todavía no tienes pedidos. Crea el primero para enviarlo a fábrica.
        </p>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <CustomerOrderCard
              key={order.id}
              order={order}
              href={`/seller/orders/${order.id}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
