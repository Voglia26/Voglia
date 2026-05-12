"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

export type ReorderItemInput = {
  item_id: string;
  quote_id: string | null;
  quantity: number;
  size?: string | null;
  gold_color?: string | null;
  gemstone?: string | null;
  other_comments?: string | null;
};

export async function createReorder(
  original_po_id: string,
  inputs: ReorderItemInput[]
): Promise<{ ok: false; error: string } | never> {
  const supabase = createAdminClient();

  const { data: originalPo } = await supabase
    .from("purchase_orders")
    .select("factory_id, quotation_id")
    .eq("id", original_po_id)
    .maybeSingle();

  if (!originalPo) return { ok: false, error: "Original PO not found" };

  const { data: newPo, error: poErr } = await supabase
    .from("purchase_orders")
    .insert({ factory_id: originalPo.factory_id, quotation_id: originalPo.quotation_id })
    .select("id")
    .single();

  if (poErr || !newPo) return { ok: false, error: poErr?.message ?? "Failed to create PO" };

  const rows = inputs
    .filter((i) => i.quantity >= 1)
    .map((i) => ({
      purchase_order_id: newPo.id,
      item_id: i.item_id,
      quote_id: i.quote_id ?? null,
      quantity: i.quantity,
      size: i.size || null,
      gold_color: i.gold_color || null,
      gemstone: i.gemstone || null,
      other_comments: i.other_comments || null,
    }));

  const { error: itemsErr } = await supabase.from("purchase_order_items").insert(rows);
  if (itemsErr) return { ok: false, error: itemsErr.message };

  revalidatePath("/admin/purchase-orders");
  redirect(`/admin/purchase-orders/${newPo.id}`);
}
