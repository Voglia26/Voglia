"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  normalizeStoneLines,
  resolveDiamondCost,
  quoteUsesCaratCalculation,
  type QuoteStoneLine,
} from "@/lib/types";

export type QuoteValuesInput = {
  gold_loss: number | null;
  total_gold_cost: number | null;
  diamond_cost: number | null;
  cost_per_carat: number | null;
  total_carats: number | null;
  stone_lines: QuoteStoneLine[];
  labor: number | null;
  other_fees: number | null;
};

export type VariantQuoteInput = {
  assignmentId: string;
  variantId: string;
  label: string;
  description: string;
  values: QuoteValuesInput;
  final_price?: number | null;
  declined?: boolean;
  notes?: string | null;
  karatage?: string | null;
  product_description?: string | null;
};

function normalizeQuoteValues(values: QuoteValuesInput): QuoteValuesInput {
  const stone_lines = normalizeStoneLines(values.stone_lines);
  const usesStones = stone_lines.length > 0;
  const quoteLike = { ...values, stone_lines };
  const diamond_cost =
    usesStones || quoteUsesCaratCalculation(quoteLike)
      ? resolveDiamondCost(quoteLike)
      : values.diamond_cost;
  return {
    ...values,
    stone_lines,
    diamond_cost,
    cost_per_carat: usesStones ? null : values.cost_per_carat,
    total_carats: usesStones ? null : values.total_carats,
  };
}

async function syncAssignmentVariants(
  supabase: ReturnType<typeof createAdminClient>,
  assignmentId: string,
  variants: { id: string; label: string; description: string; position: number }[]
) {
  const { data: existing } = await supabase
    .from("item_variants")
    .select("id")
    .eq("item_assignment_id", assignmentId);

  const keepIds = new Set(variants.map((v) => v.id));
  for (const row of existing ?? []) {
    if (!keepIds.has(row.id)) {
      await supabase.from("item_variants").delete().eq("id", row.id);
    }
  }

  for (let i = 0; i < variants.length; i++) {
    const v = variants[i];
    const payload = {
      item_assignment_id: assignmentId,
      label: v.label,
      description: v.description || null,
      position: i,
    };
    const { data: found } = await supabase
      .from("item_variants")
      .select("id")
      .eq("id", v.id)
      .maybeSingle();

    if (found) {
      await supabase
        .from("item_variants")
        .update(payload)
        .eq("id", v.id)
        .eq("item_assignment_id", assignmentId);
    } else {
      await supabase.from("item_variants").insert({ id: v.id, ...payload });
    }
  }
}

export async function submitFactoryQuotation(
  token: string,
  inputs: VariantQuoteInput[]
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

  const validAssignmentIds = new Set((assignRows ?? []).map((r) => r.id));

  const filtered = inputs.filter((i) => validAssignmentIds.has(i.assignmentId));

  const variantsByAssignment = new Map<
    string,
    { id: string; label: string; description: string; position: number }[]
  >();
  for (const input of filtered) {
    const label = input.label.trim();
    if (!label) continue;
    const list = variantsByAssignment.get(input.assignmentId) ?? [];
    if (!list.some((v) => v.id === input.variantId)) {
      list.push({
        id: input.variantId,
        label,
        description: input.description.trim(),
        position: list.length,
      });
      variantsByAssignment.set(input.assignmentId, list);
    }
  }

  for (const [assignmentId, variants] of variantsByAssignment) {
    await syncAssignmentVariants(supabase, assignmentId, variants);
  }

  for (const assignmentId of validAssignmentIds) {
    if (!variantsByAssignment.has(assignmentId)) {
      await syncAssignmentVariants(supabase, assignmentId, []);
    }
  }

  const quoteRows = filtered
    .filter((i) => i.label.trim())
    .map((i) => {
      const v = i.declined ? null : normalizeQuoteValues(i.values);
      return {
        item_assignment_id: i.assignmentId,
        variant_id: i.variantId,
        gold_loss: i.declined ? null : v?.gold_loss ?? null,
        total_gold_cost: i.declined ? null : v?.total_gold_cost ?? null,
        diamond_cost: i.declined ? null : v?.diamond_cost ?? null,
        cost_per_carat: i.declined ? null : v?.cost_per_carat ?? null,
        total_carats: i.declined ? null : v?.total_carats ?? null,
        stone_lines: i.declined ? [] : v?.stone_lines ?? [],
        labor: i.declined ? null : v?.labor ?? null,
        other_fees: i.declined ? null : v?.other_fees ?? null,
        final_price: i.declined ? null : i.final_price ?? null,
        declined: !!i.declined,
        notes: i.notes?.trim() || null,
        karatage: i.declined ? null : i.karatage?.trim() || null,
        product_description: i.declined
          ? null
          : i.product_description?.trim() || null,
        submitted_at: new Date().toISOString(),
      };
    });

  if (quoteRows.length > 0) {
    const { error } = await supabase
      .from("quotes")
      .upsert(quoteRows, { onConflict: "item_assignment_id,variant_id" });
    if (error) return { ok: false, error: error.message };
  }

  const { error: updErr } = await supabase
    .from("quotation_factories")
    .update({ accepted_at: new Date().toISOString() })
    .eq("id", qf.id);
  if (updErr) return { ok: false, error: updErr.message };

  return { ok: true };
}
