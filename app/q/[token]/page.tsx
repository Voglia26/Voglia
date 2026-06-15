import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeItem } from "@/lib/items";
import type { Item, Quote } from "@/lib/types";
import { FactoryForm } from "@/components/public/factory-form";
import { Card } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";
import { VogliaLogo } from "@/components/brand/logo";

type AssignmentRow = {
  id: string;
  item_id: string;
  quotes: Quote | Quote[] | null;
};

export default async function FactoryQuotePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = createAdminClient();

  const { data: qf } = await supabase
    .from("quotation_factories")
    .select(
      "id, token, accepted_at, quotation:quotations(id, title), factory:factories(id, name)"
    )
    .eq("token", token)
    .maybeSingle();

  if (!qf) notFound();

  const quotation = Array.isArray(qf.quotation) ? qf.quotation[0] : qf.quotation;
  const factory = Array.isArray(qf.factory) ? qf.factory[0] : qf.factory;

  const { data: assignRows } = await supabase
    .from("item_assignments")
    .select("id, item_id, quotes(*)")
    .eq("quotation_factory_id", qf.id);

  const assignments = (assignRows ?? []) as AssignmentRow[];
  const itemIds = [...new Set(assignments.map((a) => a.item_id))];

  const { data: itemsData } =
    itemIds.length > 0
      ? await supabase.from("items").select("*").in("id", itemIds)
      : { data: [] as Record<string, unknown>[] };

  const itemMap = new Map(
    (itemsData ?? []).map((raw) => {
      const item = normalizeItem(raw as Parameters<typeof normalizeItem>[0]);
      return [item.id, item] as const;
    })
  );

  const rows = assignments
    .map((a) => {
      const item = itemMap.get(a.item_id);
      if (!item) return null;
      const quote = Array.isArray(a.quotes) ? a.quotes[0] ?? null : a.quotes;
      return { id: a.id, item, quote };
    })
    .filter((r): r is { id: string; item: Item; quote: Quote | null } => !!r);

  const alreadySubmitted = !!qf.accepted_at;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <header className="mb-10 sm:mb-14 text-center border-b pb-10">
          <VogliaLogo
            width={450}
            height={112}
            className="h-24 sm:h-28 w-auto mx-auto mb-8 animate-fade-in"
          />
          <p className="eyebrow">Quotation request</p>
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl mt-4 text-balance">
            {quotation?.title}
          </h1>
          <p className="text-muted-foreground mt-4 text-sm sm:text-base">
            For{" "}
            <span className="font-medium text-foreground">
              {factory?.name}
            </span>
            {alreadySubmitted
              ? " · Update your quote below and resubmit."
              : " · Please quote the items below."}
          </p>
        </header>

        {alreadySubmitted && (
          <Card className="p-4 mb-6 border-green-600/30 bg-green-600/5">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-sm">Quotation submitted</p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  You can edit your prices and resubmit at any time.
                </p>
              </div>
            </div>
          </Card>
        )}

        {rows.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground border-dashed">
            <p className="font-heading text-lg mb-1">No items assigned</p>
            <p className="text-sm">
              No products have been assigned to your factory for this quotation
              yet.
            </p>
          </Card>
        ) : (
          <FactoryForm
            token={token}
            alreadySubmitted={alreadySubmitted}
            items={rows.map((r) => ({
              assignmentId: r.id,
              item: r.item,
              quote: r.quote,
            }))}
          />
        )}
      </div>
    </div>
  );
}
