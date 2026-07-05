"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { isFactoryVisibleInCompare } from "@/lib/quotation-compare";
import { syncInventoryFromAwards } from "@/lib/inventory";
import {
  createShipmentFromPurchaseOrder,
  deleteShipmentItemForPoLine,
  getOrCreateShipmentForPurchaseOrder,
  syncShipmentItemForPoLine,
} from "@/lib/shipments";
import type { Item } from "@/lib/types";

export type AwardInput = {
  variant_id: string;
  item_id: string;
  factory_id: string;
  quote_id: string;
  quantity: number;
  notes: string | null;
};

export type RoundPoItem = {
  item_id: string;
  quote_id: string;
  quantity: number;
  notes: string | null;
  purchase_order_item_id: string;
};

export type RoundPurchaseOrder = {
  id: string;
  factory_id: string;
  token: string;
  items: RoundPoItem[];
  created_at: string;
};

export type SyncItemPOResult =
  | {
      ok: true;
      po: { id: string; token: string; factory_id: string };
      item: RoundPoItem;
      quotationClosed: boolean;
    }
  | { ok: false; error: string };

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

async function cleanupEmptyPurchaseOrder(
  supabase: ReturnType<typeof createAdminClient>,
  purchaseOrderId: string
): Promise<void> {
  const { count } = await supabase
    .from("purchase_order_items")
    .select("id", { count: "exact", head: true })
    .eq("purchase_order_id", purchaseOrderId);

  if ((count ?? 0) > 0) return;

  await supabase.from("shipments").delete().eq("purchase_order_id", purchaseOrderId);
  await supabase.from("purchase_orders").delete().eq("id", purchaseOrderId);
}

async function removeItemFromRoundPurchaseOrders(
  supabase: ReturnType<typeof createAdminClient>,
  quotation_id: string,
  opened_at: string,
  item_id: string
): Promise<void> {
  const { data: pos } = await supabase
    .from("purchase_orders")
    .select("id, purchase_order_items(id, item_id)")
    .eq("quotation_id", quotation_id)
    .gte("created_at", opened_at);

  for (const po of pos ?? []) {
    const lines = (po.purchase_order_items ?? []) as {
      id: string;
      item_id: string;
    }[];
    const line = lines.find((l) => l.item_id === item_id);
    if (!line) continue;

    await deleteShipmentItemForPoLine(supabase, line.id);
    await supabase.from("purchase_order_items").delete().eq("id", line.id);
    await cleanupEmptyPurchaseOrder(supabase, po.id);
  }
}

async function getOrCreateRoundPurchaseOrder(
  supabase: ReturnType<typeof createAdminClient>,
  quotation_id: string,
  factory_id: string,
  opened_at: string
): Promise<
  | { ok: true; id: string; token: string; created_at: string; isNew: boolean }
  | { ok: false; error: string }
> {
  const { data: existing } = await supabase
    .from("purchase_orders")
    .select("id, token, created_at")
    .eq("quotation_id", quotation_id)
    .eq("factory_id", factory_id)
    .gte("created_at", opened_at)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (existing) {
    return { ok: true, ...existing, isNew: false };
  }

  const { data: po, error: poErr } = await supabase
    .from("purchase_orders")
    .insert({ quotation_id, factory_id })
    .select("id, token, created_at")
    .single();

  if (poErr || !po) {
    return { ok: false, error: poErr?.message ?? "PO insert failed" };
  }

  const shipRes = await createShipmentFromPurchaseOrder(
    supabase,
    po.id,
    factory_id,
    po.created_at
  );
  if (!shipRes.ok) return shipRes;

  return { ok: true, ...po, isNew: true };
}

function mapRoundPurchaseOrders(
  pos: {
    id: string;
    factory_id: string;
    token: string;
    created_at: string;
    purchase_order_items: RoundPoItem[] | null;
  }[]
): RoundPurchaseOrder[] {
  return pos.map((po) => ({
    id: po.id,
    factory_id: po.factory_id,
    token: po.token,
    created_at: po.created_at,
    items: (po.purchase_order_items ?? []).map((line) => ({
      item_id: line.item_id,
      quote_id: line.quote_id,
      quantity: line.quantity,
      notes: line.notes ?? null,
      purchase_order_item_id: line.purchase_order_item_id,
    })),
  }));
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
      "id, factory_id, token, created_at, purchase_order_items(id, item_id, quote_id, quantity, notes)"
    )
    .eq("quotation_id", quotation_id)
    .gte("created_at", quotation.opened_at)
    .order("created_at", { ascending: true });

  return mapRoundPurchaseOrders(
    (pos ?? []).map((po) => ({
      ...po,
      purchase_order_items: ((po.purchase_order_items ?? []) as {
        id: string;
        item_id: string;
        quote_id: string;
        quantity: number;
        notes: string | null;
      }[]).map((line) => ({
        item_id: line.item_id,
        quote_id: line.quote_id,
        quantity: line.quantity,
        notes: line.notes,
        purchase_order_item_id: line.id,
      })),
    }))
  );
}

export async function syncPurchaseOrderItem(
  quotation_id: string,
  award: AwardInput,
  all_awards: AwardInput[]
): Promise<SyncItemPOResult> {
  if (!award.quote_id || !award.factory_id || !award.item_id || award.quantity < 1) {
    return { ok: false, error: "Datos de adjudicación inválidos" };
  }

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

  const openedAt = quotation.opened_at ?? new Date(0).toISOString();

  const { data: factory } = await supabase
    .from("factories")
    .select("id, name")
    .eq("id", award.factory_id)
    .maybeSingle();

  if (!factory || !isFactoryVisibleInCompare(factory)) {
    return { ok: false, error: "Fábrica no disponible en Compare" };
  }

  await removeItemFromRoundPurchaseOrders(
    supabase,
    quotation_id,
    openedAt,
    award.item_id
  );

  const poRes = await getOrCreateRoundPurchaseOrder(
    supabase,
    quotation_id,
    award.factory_id,
    openedAt
  );
  if (!poRes.ok) return poRes;

  const notes = award.notes?.trim() || null;

  const { data: existingLine } = await supabase
    .from("purchase_order_items")
    .select("id")
    .eq("purchase_order_id", poRes.id)
    .eq("item_id", award.item_id)
    .maybeSingle();

  let purchaseOrderItemId: string;

  if (existingLine) {
    const { error } = await supabase
      .from("purchase_order_items")
      .update({
        quote_id: award.quote_id,
        quantity: award.quantity,
        notes,
      })
      .eq("id", existingLine.id);
    if (error) return { ok: false, error: error.message };
    purchaseOrderItemId = existingLine.id;
  } else {
    const { data: inserted, error } = await supabase
      .from("purchase_order_items")
      .insert({
        purchase_order_id: poRes.id,
        item_id: award.item_id,
        quote_id: award.quote_id,
        quantity: award.quantity,
        notes,
      })
      .select("id")
      .single();
    if (error || !inserted) {
      return { ok: false, error: error?.message ?? "PO line insert failed" };
    }
    purchaseOrderItemId = inserted.id;
  }

  const { data: itemRow, error: itemErr } = await supabase
    .from("items")
    .select("id, name, sku, photo_urls")
    .eq("id", award.item_id)
    .maybeSingle();

  if (itemErr || !itemRow) {
    return { ok: false, error: itemErr?.message ?? "Item not found" };
  }

  const { count: lineCount } = await supabase
    .from("purchase_order_items")
    .select("id", { count: "exact", head: true })
    .eq("purchase_order_id", poRes.id);

  const shipRes = await getOrCreateShipmentForPurchaseOrder(
    supabase,
    poRes.id,
    award.factory_id,
    poRes.created_at
  );
  if (!shipRes.ok) return shipRes;

  const syncShipRes = await syncShipmentItemForPoLine(
    supabase,
    shipRes.id,
    purchaseOrderItemId,
    itemRow as Item,
    award.quantity,
    notes,
    Math.max(0, (lineCount ?? 1) - 1)
  );
  if (!syncShipRes.ok) return syncShipRes;

  const syncInvRes = await syncInventoryFromAwards(supabase, quotation_id, [
    {
      item_id: award.item_id,
      factory_id: award.factory_id,
      quote_id: award.quote_id,
      quantity: award.quantity,
      purchase_order_id: poRes.id,
    },
  ]);
  if (!syncInvRes.ok) return syncInvRes;

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
    po: { id: poRes.id, token: poRes.token, factory_id: award.factory_id },
    item: {
      item_id: award.item_id,
      quote_id: award.quote_id,
      quantity: award.quantity,
      notes,
      purchase_order_item_id: purchaseOrderItemId,
    },
    quotationClosed,
  };
}

export async function generatePurchaseOrderForFactory(
  quotation_id: string,
  factory_id: string,
  factory_awards: AwardInput[],
  all_awards: AwardInput[]
): Promise<GeneratePOResult> {
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

  let lastPo: { id: string; token: string; factory_id: string } | null = null;
  let quotationClosed = false;

  for (const award of factoryAwards) {
    const res = await syncPurchaseOrderItem(quotation_id, award, all_awards);
    if (!res.ok) return res;
    lastPo = res.po;
    quotationClosed = res.quotationClosed;
  }

  return {
    ok: true,
    po: lastPo!,
    quotationClosed,
  };
}

/** @deprecated Use syncPurchaseOrderItem per item instead */
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
