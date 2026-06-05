import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, ClipboardList, ArrowRight, Plus } from "lucide-react";
import type { Quotation } from "@/lib/types";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";

type QotationWithCount = Quotation & {
  factory_count: number;
  responded_count: number;
};

type POSummary = {
  id: string;
  created_at: string;
  status: "pending" | "received";
  factory_name: string | null;
  quotation_title: string | null;
  total_qty: number;
};

export default async function AdminHome() {
  const supabase = createAdminClient();

  const [{ data: qData }, { data: poData }] = await Promise.all([
    supabase
      .from("quotations")
      .select("*, quotation_factories(id, accepted_at)")
      .neq("status", "closed")
      .order("created_at", { ascending: false })
      .limit(6),
    supabase
      .from("purchase_orders")
      .select(
        "id, created_at, status, factory:factories(name), quotation:quotations(title), items:purchase_order_items(quantity)"
      )
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(6),
  ]);

  type QWith = Quotation & {
    quotation_factories: { id: string; accepted_at: string | null }[];
  };
  const activeQuotations: QotationWithCount[] = ((qData ?? []) as QWith[]).map(
    (q) => ({
      ...q,
      factory_count: q.quotation_factories.length,
      responded_count: q.quotation_factories.filter((qf) => qf.accepted_at)
        .length,
    })
  );

  type PORow = {
    id: string;
    created_at: string;
    status: "pending" | "received";
    factory: { name: string } | { name: string }[] | null;
    quotation: { title: string } | { title: string }[] | null;
    items: { quantity: number }[];
  };
  const pendingPOs: POSummary[] = ((poData ?? []) as PORow[]).map((r) => ({
    id: r.id,
    created_at: r.created_at,
    status: r.status,
    factory_name: Array.isArray(r.factory)
      ? r.factory[0]?.name ?? null
      : r.factory?.name ?? null,
    quotation_title: Array.isArray(r.quotation)
      ? r.quotation[0]?.title ?? null
      : r.quotation?.title ?? null,
    total_qty: r.items.reduce((s, i) => s + i.quantity, 0),
  }));

  return (
    <div>
      <PageHeader
        eyebrow="Atelier"
        title="Dashboard"
        description="Active quotations and pending orders at a glance."
        actions={
          <Link href="/admin/quotations">
            <Button variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              New quotation
            </Button>
          </Link>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Section
          icon={<FileText className="h-4 w-4" />}
          title="Active quotations"
          viewAllHref="/admin/quotations"
          empty="No active quotations."
        >
          {activeQuotations.map((q) => (
            <Link key={q.id} href={`/admin/quotations/${q.id}`}>
              <Card className="p-4 hover:border-foreground/20 hover:shadow-sm transition-all">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-heading text-lg truncate">{q.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {q.factory_count} factor
                      {q.factory_count !== 1 ? "ies" : "y"} · {q.responded_count}{" "}
                      responded
                    </p>
                  </div>
                  <Badge
                    variant={q.status === "draft" ? "outline" : "secondary"}
                  >
                    {q.status}
                  </Badge>
                </div>
              </Card>
            </Link>
          ))}
        </Section>

        <Section
          icon={<ClipboardList className="h-4 w-4" />}
          title="Pending purchase orders"
          viewAllHref="/admin/purchase-orders"
          empty="No pending purchase orders."
        >
          {pendingPOs.map((po) => (
            <Link key={po.id} href={`/admin/purchase-orders/${po.id}`}>
              <Card className="p-4 hover:border-foreground/20 hover:shadow-sm transition-all">
                <p className="font-heading text-lg truncate">
                  {po.factory_name ?? "—"}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {po.quotation_title} · qty {po.total_qty} ·{" "}
                  {new Date(po.created_at).toLocaleDateString()}
                </p>
              </Card>
            </Link>
          ))}
        </Section>
      </div>
    </div>
  );
}

function Section({
  icon,
  title,
  viewAllHref,
  empty,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  viewAllHref: string;
  empty: string;
  children: React.ReactNode;
}) {
  const childArray = Array.isArray(children) ? children : [children];
  const hasItems = childArray.length > 0;

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="eyebrow flex items-center gap-2">
          <span className="text-foreground">{icon}</span>
          {title}
        </h2>
        <Link
          href={viewAllHref}
          className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition-colors"
        >
          View all <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      {!hasItems ? (
        <Card className="p-10 text-center text-muted-foreground text-sm border-dashed">
          {empty}
        </Card>
      ) : (
        <div className="grid gap-2">{children}</div>
      )}
    </section>
  );
}
