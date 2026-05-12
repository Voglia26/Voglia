"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";

export type AwardInput = {
  item_id: string;
  factory_id: string;
  quote_id: string | null;
  quantity: number;
  size?: string;
  gold_color?: string;
  gemstone?: string;
  other_comments?: string;
};

export async function generatePurchaseOrders(
  quotation_id: string,
  awards: AwardInput[]
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (awards.length === 0) return { ok: false, error: "No awards selected" };
  const supabase = createAdminClient();

  const byFactory = new Map<string, AwardInput[]>();
  for (const a of awards) {
    if (!a.factory_id || !a.item_id || a.quantity < 1) continue;
    const list = byFactory.get(a.factory_id) ?? [];
    list.push(a);
    byFactory.set(a.factory_id, list);
  }
  if (byFactory.size === 0) return { ok: false, error: "No valid awards" };

  for (const [factory_id, list] of byFactory.entries()) {
    const { data: po, error: poErr } = await supabase
      .from("purchase_orders")
      .insert({ quotation_id, factory_id })
      .select("id")
      .single();
    if (poErr || !po) return { ok: false, error: poErr?.message ?? "PO insert failed" };

    const rows = list.map((a) => ({
      purchase_order_id: po.id,
      item_id: a.item_id,
      quote_id: a.quote_id,
      quantity: a.quantity,
      size: a.size || null,
      gold_color: a.gold_color || null,
      gemstone: a.gemstone || null,
      other_comments: a.other_comments || null,
    }));
    const { error: itemsErr } = await supabase
      .from("purchase_order_items")
      .insert(rows);
    if (itemsErr) return { ok: false, error: itemsErr.message };
  }

  await supabase
    .from("quotations")
    .update({ status: "closed", closed_at: new Date().toISOString() })
    .eq("id", quotation_id);

  revalidatePath(`/admin/quotations/${quotation_id}`);
  revalidatePath("/admin/purchase-orders");
  redirect("/admin/purchase-orders");
}
