"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  loadQuotationCompareData,
  hasAnyQuotes,
  type ItemCompareRow,
} from "@/lib/quotation-compare";
import { fetchRoundPurchaseOrders, type RoundPurchaseOrder } from "./compare/actions";

export async function fetchQuotationCompareData(quotationId: string): Promise<{
  rows: ItemCompareRow[];
  factories: { id: string; name: string }[];
  hasQuotes: boolean;
  quotationStatus: "draft" | "sent" | "closed";
  roundPurchaseOrders: RoundPurchaseOrder[];
} | null> {
  const supabase = createAdminClient();
  const data = await loadQuotationCompareData(supabase, quotationId);
  if (!data) return null;
  const roundPurchaseOrders = await fetchRoundPurchaseOrders(quotationId);
  return {
    rows: data.rows,
    factories: data.factories.map((f) => ({ id: f.id, name: f.name })),
    hasQuotes: hasAnyQuotes(data.rows),
    quotationStatus: data.quotation.status,
    roundPurchaseOrders,
  };
}
