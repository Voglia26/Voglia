import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Factory,
  Item,
  ItemAssignment,
  ItemVariant,
  Quotation,
  QuotationFactory,
  Quote,
} from "@/lib/types";
import { quoteTotal, formatQuoteGrams, quoteGoldGrams } from "@/lib/types";

export type QuoteOption = {
  quoteId: string;
  variantId: string;
  variantLabel: string;
  total: number;
  declined: boolean;
  gramsLabel: string | null;
  weightG: number | null;
  lossG: number | null;
};

export type ItemCompareRow = {
  item: Item;
  byFactoryId: Record<string, QuoteOption[]>;
};

export type QuotationCompareData = {
  quotation: Quotation;
  factories: Factory[];
  rows: ItemCompareRow[];
};

export async function loadQuotationCompareData(
  supabase: SupabaseClient,
  quotationId: string
): Promise<QuotationCompareData | null> {
  const [qRes, itemsRes, qfRes] = await Promise.all([
    supabase.from("quotations").select("*").eq("id", quotationId).maybeSingle(),
    supabase
      .from("items")
      .select("*")
      .eq("quotation_id", quotationId)
      .order("created_at", { ascending: true }),
    supabase
      .from("quotation_factories")
      .select("*, factory:factories(*), item_assignments(*, quotes(*))")
      .eq("quotation_id", quotationId),
  ]);

  const quotation = qRes.data as Quotation | null;
  if (!quotation) return null;

  const items: Item[] = itemsRes.data ?? [];
  const itemsById = new Map(items.map((i) => [i.id, i]));

  type QfShape = QuotationFactory & {
    factory: Factory | Factory[];
    item_assignments: (ItemAssignment & { quotes: Quote | Quote[] | null })[];
  };

  const qfs = ((qfRes.data ?? []) as unknown as QfShape[]).map((qf) => ({
    factory: Array.isArray(qf.factory) ? qf.factory[0] : qf.factory,
    assignments: qf.item_assignments,
  }));

  const factories = qfs.map((qf) => qf.factory).sort((a, b) => a.name.localeCompare(b.name));

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

  const itemFactoryOptions = new Map<string, Map<string, QuoteOption[]>>();

  for (const qf of qfs) {
    for (const assignment of qf.assignments) {
      const item = itemsById.get(assignment.item_id);
      if (!item) continue;

      const quotes = Array.isArray(assignment.quotes)
        ? assignment.quotes
        : assignment.quotes
          ? [assignment.quotes]
          : [];

      const options: QuoteOption[] = [];
      for (const quote of quotes) {
        const variant = variantsById.get(quote.variant_id);
        if (!variant) continue;
        const refWeightG = item.specs?.weight_g ?? null;
        const { weightG, lossG } = quoteGoldGrams(quote, refWeightG);
        options.push({
          quoteId: quote.id,
          variantId: variant.id,
          variantLabel: variant.label,
          total: quoteTotal(quote),
          declined: !!quote.declined,
          gramsLabel: formatQuoteGrams(quote, refWeightG),
          weightG,
          lossG,
        });
      }

      if (!itemFactoryOptions.has(item.id)) {
        itemFactoryOptions.set(item.id, new Map());
      }
      itemFactoryOptions.get(item.id)!.set(qf.factory.id, options);
    }
  }

  const rows: ItemCompareRow[] = items.map((item) => {
    const factoryMap = itemFactoryOptions.get(item.id);
    const byFactoryId: Record<string, QuoteOption[]> = {};
    for (const f of factories) {
      byFactoryId[f.id] = factoryMap?.get(f.id) ?? [];
    }
    return { item, byFactoryId };
  });

  return { quotation, factories, rows };
}

export function bestValidOption(options: QuoteOption[]): QuoteOption | null {
  let best: QuoteOption | null = null;
  for (const o of options) {
    if (o.declined) continue;
    if (o.total <= 0) continue;
    if (!best || o.total < best.total) best = o;
  }
  return best;
}

export function hasAnyQuotes(rows: ItemCompareRow[]): boolean {
  return rows.some((row) =>
    Object.values(row.byFactoryId).some((opts) =>
      opts.some((o) => !o.declined && o.total > 0)
    )
  );
}
