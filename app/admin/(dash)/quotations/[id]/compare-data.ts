"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  loadQuotationCompareData,
  hasAnyQuotes,
  type ItemCompareRow,
} from "@/lib/quotation-compare";

export async function fetchQuotationCompareData(quotationId: string): Promise<{
  rows: ItemCompareRow[];
  factories: { id: string; name: string }[];
  hasQuotes: boolean;
} | null> {
  const supabase = createAdminClient();
  const data = await loadQuotationCompareData(supabase, quotationId);
  if (!data) return null;
  return {
    rows: data.rows,
    factories: data.factories.map((f) => ({ id: f.id, name: f.name })),
    hasQuotes: hasAnyQuotes(data.rows),
  };
}
