"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { QUOTE_COLUMNS, type QuoteColumnKey } from "@/lib/types";

export type QuoteInput = {
  assignmentId: string;
  values: Partial<Record<QuoteColumnKey, number | null>>;
  final_price?: number | null;
  declined?: boolean;
  notes?: string | null;
  karatage?: string | null;
  product_description?: string | null;
};

export async function submitFactoryQuotation(
  token: string,
  inputs: QuoteInput[]
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = createAdminClient();

  const { data: qf } = await supabase
    .from("quotation_factories")
    .select("id, accepted_at")
    .eq("token", token)
    .maybeSingle();

  if (!qf) return { ok: false, error: "Link not found" };

  const { data: assignRows } = await supabase
    .from("item_assignments")
    .select("id")
    .eq("quotation_factory_id", qf.id);

  const validIds = new Set((assignRows ?? []).map((r) => r.id));

  const rows = inputs
    .filter((i) => validIds.has(i.assignmentId))
    .map((i) => ({
      item_assignment_id: i.assignmentId,
      gold_loss: i.declined ? null : i.values.gold_loss ?? null,
      total_gold_cost: i.declined ? null : i.values.total_gold_cost ?? null,
      diamond_cost: i.declined ? null : i.values.diamond_cost ?? null,
      cost_per_carat: i.declined ? null : i.values.cost_per_carat ?? null,
      labor: i.declined ? null : i.values.labor ?? null,
      other_fees: i.declined ? null : i.values.other_fees ?? null,
      final_price: i.declined ? null : i.final_price ?? null,
      declined: !!i.declined,
      notes: i.notes?.trim() || null,
      karatage: i.declined ? null : i.karatage?.trim() || null,
      product_description: i.declined
        ? null
        : i.product_description?.trim() || null,
      submitted_at: new Date().toISOString(),
    }));

  if (rows.length > 0) {
    const { error } = await supabase
      .from("quotes")
      .upsert(rows, { onConflict: "item_assignment_id" });
    if (error) return { ok: false, error: error.message };
  }

  const { error: updErr } = await supabase
    .from("quotation_factories")
    .update({ accepted_at: new Date().toISOString() })
    .eq("id", qf.id);
  if (updErr) return { ok: false, error: updErr.message };

  revalidatePath(`/q/${token}`);
  return { ok: true };
}
