import { notFound } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  Item,
  Factory,
  QuotationFactory,
  Quote,
  Quotation,
  ItemAssignment,
} from "@/lib/types";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { ComparisonTable } from "@/components/quotations/comparison-table";
import { PageHeader } from "@/components/admin/page-header";

export default async function ComparePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createAdminClient();

  const [qRes, itemsRes, qfRes] = await Promise.all([
    supabase.from("quotations").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("items")
      .select("*")
      .eq("quotation_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .from("quotation_factories")
      .select("*, factory:factories(*), item_assignments(*, quotes(*))")
      .eq("quotation_id", id),
  ]);

  const quotation = qRes.data as Quotation | null;
  if (!quotation) notFound();
  const items: Item[] = itemsRes.data ?? [];

  type QfShape = QuotationFactory & {
    factory: Factory | Factory[];
    item_assignments: (ItemAssignment & { quotes: Quote | Quote[] | null })[];
  };
  const qfs = ((qfRes.data ?? []) as unknown as QfShape[]).map((qf) => {
    const factory = Array.isArray(qf.factory) ? qf.factory[0] : qf.factory;
    const assignments = qf.item_assignments.map((a) => ({
      id: a.id,
      item_id: a.item_id,
      quote: Array.isArray(a.quotes) ? a.quotes[0] ?? null : a.quotes,
    }));
    return { id: qf.id, factory, accepted_at: qf.accepted_at, assignments };
  });

  const quotesByItemAndFactory = new Map<string, Map<string, Quote>>();
  for (const qf of qfs) {
    for (const a of qf.assignments) {
      if (!a.quote) continue;
      const inner =
        quotesByItemAndFactory.get(a.item_id) ?? new Map<string, Quote>();
      inner.set(qf.factory.id, a.quote);
      quotesByItemAndFactory.set(a.item_id, inner);
    }
  }

  const participatingFactories = qfs.map((qf) => qf.factory);

  return (
    <div>
      <Link
        href={`/admin/quotations/${id}`}
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to quotation
      </Link>

      <PageHeader
        eyebrow="Comparison"
        title={quotation.title}
        description="Click a column header to sort. The lowest total per item is highlighted. Pick a winner and quantity, then generate purchase orders."
      />

      {participatingFactories.length === 0 ? (
        <p className="text-sm text-muted-foreground">No factories assigned.</p>
      ) : (
        <ComparisonTable
          quotationId={id}
          quotationStatus={quotation.status}
          items={items}
          factories={participatingFactories}
          quotesByItemAndFactory={Object.fromEntries(
            Array.from(quotesByItemAndFactory.entries()).map(([itemId, m]) => [
              itemId,
              Object.fromEntries(m),
            ])
          )}
        />
      )}
    </div>
  );
}
