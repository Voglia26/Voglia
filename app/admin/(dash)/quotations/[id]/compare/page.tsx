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
import { ArrowLeft } from "lucide-react";
import { ComparisonTable } from "@/components/quotations/comparison-table";
import { PageHeader } from "@/components/admin/page-header";

export type CompareRow = {
  item: Item;
  variant: ItemVariant;
  factory: Factory;
  quote: Quote;
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
  const itemsById = new Map(items.map((i) => [i.id, i]));

  type QfShape = QuotationFactory & {
    factory: Factory | Factory[];
    item_assignments: (ItemAssignment & { quotes: Quote | Quote[] | null })[];
  };
  const qfs = ((qfRes.data ?? []) as unknown as QfShape[]).map((qf) => {
    const factory = Array.isArray(qf.factory) ? qf.factory[0] : qf.factory;
    return {
      id: qf.id,
      factory,
      accepted_at: qf.accepted_at,
      assignments: qf.item_assignments,
    };
  });

  const assignmentIds = qfs.flatMap((qf) => qf.assignments.map((a) => a.id));
  const { data: variantsData } =
    assignmentIds.length > 0
      ? await supabase
          .from("item_variants")
          .select("*")
          .in("item_assignment_id", assignmentIds)
      : { data: [] as ItemVariant[] };

  const variantsById = new Map(
    ((variantsData ?? []) as ItemVariant[]).map((v) => [v.id, v])
  );

  const compareRows: CompareRow[] = [];
  for (const qf of qfs) {
    for (const a of qf.assignments) {
      const item = itemsById.get(a.item_id);
      if (!item) continue;
      const quotes = Array.isArray(a.quotes) ? a.quotes : a.quotes ? [a.quotes] : [];
      for (const quote of quotes) {
        const variant = variantsById.get(quote.variant_id);
        if (!variant) continue;
        compareRows.push({ item, variant, factory: qf.factory, quote });
      }
    }
  }

  compareRows.sort((a, b) => {
    const itemCmp = a.item.name?.localeCompare(b.item.name ?? "") ?? 0;
    if (itemCmp !== 0) return itemCmp;
    const factoryCmp = a.factory.name.localeCompare(b.factory.name);
    if (factoryCmp !== 0) return factoryCmp;
    return a.variant.position - b.variant.position;
  });

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
        description="Each row is a factory quote option. Pick winners and quantities, then generate purchase orders."
      />

      {participatingFactories.length === 0 ? (
        <p className="text-sm text-muted-foreground">No factories assigned.</p>
      ) : compareRows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No quotes submitted yet. Factories add their own options on the quote
          form.
        </p>
      ) : (
        <ComparisonTable
          quotationId={id}
          quotationStatus={quotation.status}
          rows={compareRows}
        />
      )}
    </div>
  );
}
