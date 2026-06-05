import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { POFilters } from "@/components/purchase-orders/po-filters";
import {
  PURCHASE_ORDER_STATUS_LABELS,
  type PurchaseOrderStatus,
} from "@/lib/types";

type POWithRelations = {
  id: string;
  status: PurchaseOrderStatus;
  created_at: string;
  received_at: string | null;
  token: string;
  factory: { id: string; name: string } | { id: string; name: string }[] | null;
  quotation: { id: string; title: string } | { id: string; title: string }[] | null;
  items: { id: string; quantity: number }[];
};

export default async function PurchaseOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    factory_id?: string;
    from?: string;
    to?: string;
  }>;
}) {
  const params = await searchParams;
  const supabase = createAdminClient();

  let query = supabase
    .from("purchase_orders")
    .select(
      "id, status, created_at, received_at, token, factory:factories(id, name), quotation:quotations(id, title), items:purchase_order_items(id, quantity)"
    )
    .order("created_at", { ascending: false });

  if (params.status) query = query.eq("status", params.status);
  if (params.factory_id) query = query.eq("factory_id", params.factory_id);
  if (params.from) query = query.gte("created_at", params.from);
  if (params.to) {
    const to = new Date(params.to);
    to.setDate(to.getDate() + 1);
    query = query.lt("created_at", to.toISOString());
  }

  const [{ data }, { data: factoriesData }] = await Promise.all([
    query,
    supabase.from("factories").select("id, name").order("name"),
  ]);

  const rows = (data ?? []) as unknown as POWithRelations[];
  const normalized = rows.map((r) => ({
    ...r,
    factory: Array.isArray(r.factory) ? r.factory[0] : r.factory,
    quotation: Array.isArray(r.quotation) ? r.quotation[0] : r.quotation,
    totalQty: r.items.reduce((s, i) => s + i.quantity, 0),
  }));

  const factories = factoriesData ?? [];

  return (
    <div>
      <PageHeader
        eyebrow="Orders"
        title="Purchase orders"
        description="Track what you have ordered from each factory."
      />

      <POFilters factories={factories} current={params} />

      {normalized.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground border-dashed">
          <p className="font-heading text-xl mb-2">No purchase orders found</p>
          <p className="text-sm">
            {params.status || params.factory_id || params.from || params.to
              ? "Try adjusting the filters."
              : "Generate one from a quotation's comparison view."}
          </p>
        </Card>
      ) : (
        <div className="grid gap-2">
          {normalized.map((po) => (
            <Link
              key={po.id}
              href={`/admin/purchase-orders/${po.id}`}
              className="block group"
            >
              <Card className="p-4 sm:p-5 hover:border-foreground/20 hover:shadow-sm transition-all">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="font-heading text-xl truncate">
                        {po.factory?.name ?? "—"}
                      </h3>
                      <StatusBadge status={po.status} />
                    </div>
                    <p className="text-sm text-muted-foreground mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
                      <span className="truncate max-w-[200px]">
                        {po.quotation?.title}
                      </span>
                      <span className="tabular-nums">
                        {po.items.length} item{po.items.length !== 1 ? "s" : ""}
                      </span>
                      <span className="tabular-nums">qty {po.totalQty}</span>
                      <span>
                        {new Date(po.created_at).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all shrink-0" />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: PurchaseOrderStatus }) {
  const variant =
    status === "received"
      ? "default"
      : status === "sent"
        ? "secondary"
        : status === "in_progress"
          ? "secondary"
          : status === "approved"
            ? "secondary"
            : "outline";
  return <Badge variant={variant}>{PURCHASE_ORDER_STATUS_LABELS[status]}</Badge>;
}
