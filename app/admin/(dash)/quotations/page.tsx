import Link from "next/link";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, ChevronRight, CheckCircle2 } from "lucide-react";
import type { Quotation } from "@/lib/types";
import { PageHeader } from "@/components/admin/page-header";

type Row = Quotation & {
  total_factories: number;
  accepted_factories: number;
  total_items: number;
};

export default async function QuotationsPage() {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("quotations")
    .select(
      "*, items(id), quotation_factories(id, accepted_at)"
    )
    .order("created_at", { ascending: false });

  type QWith = Quotation & {
    items: { id: string }[];
    quotation_factories: { id: string; accepted_at: string | null }[];
  };
  const rows: Row[] = ((data ?? []) as QWith[]).map((q) => ({
    ...q,
    total_items: q.items.length,
    total_factories: q.quotation_factories.length,
    accepted_factories: q.quotation_factories.filter((qf) => qf.accepted_at)
      .length,
  }));

  async function createQuotation(formData: FormData) {
    "use server";
    const title = String(formData.get("title") ?? "").trim();
    if (!title) return;
    const client = createAdminClient();
    const { data: q } = await client
      .from("quotations")
      .insert({ title })
      .select()
      .single();
    if (!q) return;
    revalidatePath("/admin/quotations");
    redirect(`/admin/quotations/${q.id}`);
  }

  return (
    <div>
      <PageHeader
        eyebrow="Pricing"
        title="Quotations"
        description="Create a quotation to request prices from factories."
      />

      <Card className="p-4 sm:p-5 mb-8 border-dashed">
        <form
          action={createQuotation}
          className="flex flex-col sm:flex-row gap-3 sm:items-center"
        >
          <Input
            name="title"
            placeholder="New quotation title (e.g. Summer 2026 Collection)"
            required
            className="h-11 text-base"
          />
          <Button type="submit" size="lg" className="shrink-0">
            <Plus className="h-4 w-4 mr-2" />
            Create
          </Button>
        </form>
      </Card>

      {rows.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground border-dashed">
          <p className="font-heading text-xl mb-2">No quotations yet</p>
          <p className="text-sm">Create your first one above.</p>
        </Card>
      ) : (
        <div className="grid gap-2">
          {rows.map((q) => (
            <Link
              key={q.id}
              href={`/admin/quotations/${q.id}`}
              className="block group"
            >
              <Card className="p-4 sm:p-5 hover:border-foreground/20 hover:shadow-sm transition-all">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="font-heading text-xl truncate">
                        {q.title}
                      </h3>
                      <StatusBadge status={q.status} />
                    </div>
                    <p className="text-sm text-muted-foreground mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
                      <span>
                        {new Date(q.created_at).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                      <span className="tabular-nums">
                        {q.total_items} item{q.total_items !== 1 ? "s" : ""}
                      </span>
                      <span
                        className={`tabular-nums inline-flex items-center gap-1 ${
                          q.accepted_factories > 0
                            ? "text-foreground"
                            : ""
                        }`}
                      >
                        {q.accepted_factories === q.total_factories &&
                        q.total_factories > 0 ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-700" />
                        ) : null}
                        {q.accepted_factories} / {q.total_factories} accepted
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

function StatusBadge({ status }: { status: Quotation["status"] }) {
  const map: Record<
    Quotation["status"],
    { label: string; variant: "default" | "secondary" | "outline" }
  > = {
    draft: { label: "Draft", variant: "outline" },
    sent: { label: "Sent", variant: "secondary" },
    closed: { label: "Closed", variant: "default" },
  };
  const m = map[status];
  return <Badge variant={m.variant}>{m.label}</Badge>;
}
