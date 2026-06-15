import { notFound } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  Item,
  ItemVariant,
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

export type CompareRow = {
  item: Item;
  variant: ItemVariant;
};

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
  const itemIds = items.map((i) => i.id);

  const { data: variantsData } =
    itemIds.length > 0
      ? await supabase
          .from("item_variants")
          .select("*")
          .in("item_id", itemIds)
          .order("position", { ascending: true })
      : { data: [] as ItemVariant[] };

  const variantsByItem = new Map<string, ItemVariant[]>();
  for (const v of (variantsData ?? []) as ItemVariant[]) {
    const list = variantsByItem.get(v.item_id) ?? [];
    list.push(v);
    variantsByItem.set(v.item_id, list);
  }

  const compareRows: CompareRow[] = items.flatMap((item) =>
    (variantsByItem.get(item.id) ?? []).map((variant) => ({ item, variant }))
  );

  type QfShape = QuotationFactory & {
    factory: Factory | Factory[];
    item_assignments: (ItemAssignment & { quotes: Quote | Quote[] | null })[];
  };
  const qfs = ((qfRes.data ?? []) as unknown as QfShape[]).map((qf) => {
    const factory = Array.isArray(qf.factory) ? qf.factory[0] : qf.factory;
    return { id: qf.id, factory, accepted_at: qf.accepted_at, assignments: qf.item_assignments };
  });

  const quotesByVariantAndFactory = new Map<string, Map<string, Quote>>();
  for (const qf of qfs) {
    for (const a of qf.assignments) {
      const quotes = Array.isArray(a.quotes) ? a.quotes : a.quotes ? [a.quotes] : [];
      for (const quote of quotes) {
        const inner =
          quotesByVariantAndFactory.get(quote.variant_id) ??
          new Map<string, Quote>();
        inner.set(qf.factory.id, quote);
        quotesByVariantAndFactory.set(quote.variant_id, inner);
      }
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
        description="Each row is a quote variant. Pick a winner and quantity per variant, then generate purchase orders."
      />

      {participatingFactories.length === 0 ? (
        <p className="text-sm text-muted-foreground">No factories assigned.</p>
      ) : compareRows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No variants defined on items yet.
        </p>
      ) : (
        <ComparisonTable
          quotationId={id}
          quotationStatus={quotation.status}
          rows={compareRows}
          factories={participatingFactories}
          quotesByVariantAndFactory={Object.fromEntries(
            Array.from(quotesByVariantAndFactory.entries()).map(([variantId, m]) => [
              variantId,
              Object.fromEntries(m),
            ])
          )}
        />
      )}
    </div>
  );
}
