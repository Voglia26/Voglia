"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { isFactoryVisibleInCompare } from "@/lib/quotation-compare";
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

export type RoundPurchaseOrder = {
  id: string;
  factory_id: string;
  token: string;
  item_ids: string[];
  created_at: string;
};

export type GeneratePOResult =
  | {
      ok: true;
      po: { id: string; token: string; factory_id: string };
      quotationClosed: boolean;
    }
  | { ok: false; error: string };

async function loadRoundItemIds(
  supabase: ReturnType<typeof createAdminClient>,
  quotation_id: string,
  opened_at: string
): Promise<Set<string>> {
  const { data: pos } = await supabase
    .from("purchase_orders")
    .select("purchase_order_items(item_id)")
    .eq("quotation_id", quotation_id)
    .gte("created_at", opened_at);

  const ids = new Set<string>();
  for (const po of pos ?? []) {
    const items = po.purchase_order_items as { item_id: string }[] | null;
    for (const row of items ?? []) {
      ids.add(row.item_id);
    }
  }
  return ids;
}

async function maybeCloseQuotation(
  supabase: ReturnType<typeof createAdminClient>,
  quotation_id: string,
  opened_at: string,
  all_awards: AwardInput[]
): Promise<boolean> {
  const validAwards = all_awards.filter(
    (a) => a.quote_id && a.factory_id && a.item_id && a.quantity >= 1
  );
  if (validAwards.length === 0) return false;

  const itemsInRound = await loadRoundItemIds(supabase, quotation_id, opened_at);
  const allCovered = validAwards.every((a) => itemsInRound.has(a.item_id));
  if (!allCovered) return false;

  await supabase
    .from("quotations")
    .update({ status: "closed", closed_at: new Date().toISOString() })
    .eq("id", quotation_id);

  return true;
}

export async function fetchRoundPurchaseOrders(
  quotation_id: string
): Promise<RoundPurchaseOrder[]> {
  const supabase = createAdminClient();
  const { data: quotation } = await supabase
    .from("quotations")
    .select("opened_at")
    .eq("id", quotation_id)
    .maybeSingle();

  if (!quotation?.opened_at) return [];

  const { data: pos } = await supabase
    .from("purchase_orders")
    .select(
      "id, factory_id, token, created_at, purchase_order_items(item_id)"
    )
    .eq("quotation_id", quotation_id)
    .gte("created_at", quotation.opened_at)
    .order("created_at", { ascending: true });

  return (pos ?? []).map((po) => {
    const items = po.purchase_order_items as { item_id: string }[] | null;
    return {
      id: po.id,
      factory_id: po.factory_id,
      token: po.token,
      item_ids: (items ?? []).map((i) => i.item_id),
      created_at: po.created_at,
    };
  });
}

export async function generatePurchaseOrderForFactory(
  quotation_id: string,
  factory_id: string,
  factory_awards: AwardInput[],
  all_awards: AwardInput[]
): Promise<GeneratePOResult> {
  const supabase = createAdminClient();

  const { data: quotation } = await supabase
    .from("quotations")
    .select("status, opened_at")
    .eq("id", quotation_id)
    .maybeSingle();

  if (!quotation) return { ok: false, error: "Cotización no encontrada" };
  if (quotation.status === "closed") {
    return { ok: false, error: "Esta cotización ya está cerrada" };
  }

  const openedAt =
    quotation.opened_at ??
    new Date(0).toISOString();

  const factoryAwards = factory_awards.filter(
    (a) =>
      a.factory_id === factory_id &&
      a.quote_id &&
      a.item_id &&
      a.quantity >= 1
  );
  if (factoryAwards.length === 0) {
    return {
      ok: false,
      error: "No hay productos adjudicados para esta fábrica",
    };
  }

  const { data: factory } = await supabase
    .from("factories")
    .select("id, name")
    .eq("id", factory_id)
    .maybeSingle();

  if (!factory || !isFactoryVisibleInCompare(factory)) {
    return { ok: false, error: "Fábrica no disponible en Compare" };
  }

  const itemsInRound = await loadRoundItemIds(
    supabase,
    quotation_id,
    openedAt
  );
  const pending = factoryAwards.filter((a) => !itemsInRound.has(a.item_id));
  if (pending.length === 0) {
    return {
      ok: false,
      error: "Todos los productos de esta fábrica ya tienen PO en esta ronda",
    };
  }

  const { data: po, error: poErr } = await supabase
    .from("purchase_orders")
    .insert({ quotation_id, factory_id })
    .select("id, token, created_at")
    .single();

  if (poErr || !po) {
    return { ok: false, error: poErr?.message ?? "PO insert failed" };
  }

  const rows = pending.map((a) => ({
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

  const inventoryAwards = pending.map((a) => ({
    item_id: a.item_id,
    factory_id: a.factory_id,
    quote_id: a.quote_id,
    quantity: a.quantity,
    purchase_order_id: po.id,
  }));

  const syncRes = await syncInventoryFromAwards(
    supabase,
    quotation_id,
    inventoryAwards
  );
  if (!syncRes.ok) return syncRes;

  const quotationClosed = await maybeCloseQuotation(
    supabase,
    quotation_id,
    openedAt,
    all_awards
  );

  revalidatePath(`/admin/quotations/${quotation_id}`);
  revalidatePath("/admin/purchase-orders");
  revalidatePath("/admin/inventory");
  revalidatePath("/admin/shipments");

  return {
    ok: true,
    po: { id: po.id, token: po.token, factory_id },
    quotationClosed,
  };
}

/** @deprecated Use generatePurchaseOrderForFactory per factory instead */
export async function generatePurchaseOrders(
  quotation_id: string,
  awards: AwardInput[]
): Promise<GeneratePOResult> {
  const byFactory = new Map<string, AwardInput[]>();
  for (const a of awards) {
    if (!a.quote_id || !a.factory_id || !a.item_id || a.quantity < 1) continue;
    const list = byFactory.get(a.factory_id) ?? [];
    list.push(a);
    byFactory.set(a.factory_id, list);
  }
  if (byFactory.size === 0) {
    return { ok: false, error: "No valid awards" };
  }

  let lastResult: GeneratePOResult | null = null;
  for (const [factory_id, list] of byFactory.entries()) {
    const res = await generatePurchaseOrderForFactory(
      quotation_id,
      factory_id,
      list,
      awards
    );
    if (!res.ok) return res;
    lastResult = res;
  }

  return lastResult!;
}
