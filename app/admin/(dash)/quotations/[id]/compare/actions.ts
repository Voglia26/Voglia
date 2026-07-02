"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncInventoryFromAwards } from "@/lib/inventory";
import { createShipmentFromPurchaseOrder } from "@/lib/shipments";

export type AwardInput = {
  variant_id: string;
  item_id: string;
  factory_id: string;
  quote_id: string;
  quantity: number;
  notes: string | null;
};

export async function generatePurchaseOrders(
  quotation_id: string,
  awards: AwardInput[]
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (awards.length === 0) return { ok: false, error: "No awards selected" };
  const supabase = createAdminClient();

  const { data: quotation } = await supabase
    .from("quotations")
    .select("status")
    .eq("id", quotation_id)
    .maybeSingle();

  if (quotation?.status === "closed") {
    return { ok: false, error: "Esta cotización ya está cerrada" };
  }

  const byFactory = new Map<string, AwardInput[]>();
  for (const a of awards) {
    if (!a.quote_id || !a.factory_id || !a.item_id || a.quantity < 1) continue;
    const list = byFactory.get(a.factory_id) ?? [];
    list.push(a);
    byFactory.set(a.factory_id, list);
  }
  if (byFactory.size === 0) return { ok: false, error: "No valid awards" };

  const inventoryAwards: {
    item_id: string;
    factory_id: string;
    quote_id: string;
    quantity: number;
    purchase_order_id: string;
  }[] = [];

  for (const [factory_id, list] of byFactory.entries()) {
    const { data: po, error: poErr } = await supabase
      .from("purchase_orders")
      .insert({ quotation_id, factory_id })
      .select("id, created_at")
      .single();
    if (poErr || !po) return { ok: false, error: poErr?.message ?? "PO insert failed" };

    const rows = list.map((a) => ({
      purchase_order_id: po.id,
      item_id: a.item_id,
      quote_id: a.quote_id,
      quantity: a.quantity,
      notes: a.notes?.trim() || null,
    }));
    const { error: itemsErr } = await supabase
      .from("purchase_order_items")
      .insert(rows);
    if (itemsErr) return { ok: false, error: itemsErr.message };

    const shipRes = await createShipmentFromPurchaseOrder(
      supabase,
      po.id,
      factory_id,
      po.created_at
    );
    if (!shipRes.ok) return shipRes;

    for (const a of list) {
      inventoryAwards.push({
        ...a,
        purchase_order_id: po.id,
      });
    }
  }

  const syncRes = await syncInventoryFromAwards(
    supabase,
    quotation_id,
    inventoryAwards
  );
  if (!syncRes.ok) return syncRes;

  await supabase
    .from("quotations")
    .update({ status: "closed", closed_at: new Date().toISOString() })
    .eq("id", quotation_id);

  revalidatePath(`/admin/quotations/${quotation_id}`);
  revalidatePath("/admin/purchase-orders");
  revalidatePath("/admin/inventory");
  revalidatePath("/admin/shipments");
  redirect("/admin/purchase-orders");
}
