import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  Factory,
  Item,
  PurchaseOrder,
  Quotation,
  Shipment,
  ShipmentItem,
} from "@/lib/types";

export function resolveItemSku(item: Pick<Item, "id" | "sku">): string {
  return item.sku?.trim() || `VL-${item.id.slice(0, 8).toUpperCase()}`;
}

export type ShipmentListRow = Shipment & {
  factory: Pick<Factory, "id" | "name">;
  items: Pick<ShipmentItem, "id" | "quantity" | "name" | "sku" | "photo_url">[];
  purchase_order: Pick<PurchaseOrder, "id"> | null;
};

export type ShipmentView = Shipment & {
  factory: Factory;
  items: ShipmentItem[];
  purchase_order: (PurchaseOrder & { quotation: Quotation | null }) | null;
};

export async function createShipmentFromPurchaseOrder(
  supabase: SupabaseClient,
  purchaseOrderId: string,
  factoryId: string,
  orderDateIso: string
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const { data: poItems, error: itemsErr } = await supabase
    .from("purchase_order_items")
    .select("id, quantity, item:items(id, name, sku, photo_urls)")
    .eq("purchase_order_id", purchaseOrderId);

  if (itemsErr) return { ok: false, error: itemsErr.message };

  const orderDate = orderDateIso.slice(0, 10);

  const { data: shipment, error: shipErr } = await supabase
    .from("shipments")
    .insert({
      purchase_order_id: purchaseOrderId,
      factory_id: factoryId,
      status: "ordered",
      order_date: orderDate,
      source: "purchase_order",
    })
    .select("id")
    .single();

  if (shipErr || !shipment) {
    return { ok: false, error: shipErr?.message ?? "Shipment insert failed" };
  }

  type PoItemRow = {
    id: string;
    quantity: number;
    item: Item | Item[] | null;
  };

  const rows = ((poItems ?? []) as PoItemRow[]).map((pi, idx) => {
    const item = Array.isArray(pi.item) ? pi.item[0] : pi.item;
    return {
      shipment_id: shipment.id,
      purchase_order_item_id: pi.id,
      name: item?.name ?? null,
      sku: item ? resolveItemSku(item) : null,
      photo_url: item?.photo_urls?.[0] ?? null,
      quantity: pi.quantity,
      position: idx,
    };
  });

  if (rows.length > 0) {
    const { error: lineErr } = await supabase
      .from("shipment_items")
      .insert(rows);
    if (lineErr) return { ok: false, error: lineErr.message };
  }

  return { ok: true, id: shipment.id };
}

export async function loadShipmentById(id: string): Promise<ShipmentView | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("shipments")
    .select(
      "*, factory:factories(*), items:shipment_items(*), purchase_order:purchase_orders(*, quotation:quotations(*))"
    )
    .eq("id", id)
    .maybeSingle();

  if (!data) return null;

  type Row = Shipment & {
    factory: Factory | Factory[];
    items: ShipmentItem[];
    purchase_order:
      | (PurchaseOrder & { quotation: Quotation | Quotation[] | null })
      | (PurchaseOrder & { quotation: Quotation | Quotation[] | null })[]
      | null;
  };

  const row = data as unknown as Row;
  const factory = Array.isArray(row.factory) ? row.factory[0] : row.factory;
  const poRaw = row.purchase_order;
  const po = Array.isArray(poRaw) ? poRaw[0] : poRaw;
  const quotationRaw = po?.quotation;
  const quotation = Array.isArray(quotationRaw)
    ? quotationRaw[0] ?? null
    : quotationRaw ?? null;

  const items = [...(row.items ?? [])].sort((a, b) => a.position - b.position);

  const {
    factory: _f,
    items: _i,
    purchase_order: _p,
    ...shipment
  } = row;

  return {
    ...(shipment as Shipment),
    factory,
    items,
    purchase_order: po
      ? { ...(po as PurchaseOrder), quotation }
      : null,
  };
}

export async function loadShipmentsList(options: {
  archived?: boolean;
  factoryId?: string;
}): Promise<ShipmentListRow[]> {
  const supabase = createAdminClient();
  let query = supabase
    .from("shipments")
    .select(
      "*, factory:factories(id, name), items:shipment_items(id, quantity, name, sku, photo_url), purchase_order:purchase_orders(id)"
    )
    .order("order_date", { ascending: false });

  if (options.archived) {
    query = query.not("archived_at", "is", null);
  } else {
    query = query.is("archived_at", null);
  }

  if (options.factoryId) {
    query = query.eq("factory_id", options.factoryId);
  }

  const { data } = await query;
  return (data ?? []).map((row) => {
    const r = row as ShipmentListRow & {
      factory: ShipmentListRow["factory"] | ShipmentListRow["factory"][];
      purchase_order:
        | ShipmentListRow["purchase_order"]
        | NonNullable<ShipmentListRow["purchase_order"]>[];
    };
    return {
      ...r,
      factory: Array.isArray(r.factory) ? r.factory[0] : r.factory,
      purchase_order: Array.isArray(r.purchase_order)
        ? r.purchase_order[0] ?? null
        : r.purchase_order,
    };
  }) as ShipmentListRow[];
}

export function parseCsvShipmentItems(
  text: string
): { name: string; sku: string; quantity: number }[] {
  const lines = text
    .trim()
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];

  const header = lines[0].split(/[,;\t]/).map((h) => h.trim().toLowerCase());
  const nameIdx = header.findIndex((h) =>
    ["name", "product", "item", "description"].includes(h)
  );
  const skuIdx = header.findIndex((h) => ["sku", "code", "ref"].includes(h));
  const qtyIdx = header.findIndex((h) =>
    ["quantity", "qty", "amount", "units"].includes(h)
  );
  if (nameIdx < 0 || qtyIdx < 0) return [];

  const out: { name: string; sku: string; quantity: number }[] = [];
  for (const line of lines.slice(1)) {
    const cols = line.split(/[,;\t]/).map((c) => c.trim().replace(/^"|"$/g, ""));
    const name = cols[nameIdx]?.trim();
    const quantity = Number(cols[qtyIdx]);
    if (!name || !Number.isFinite(quantity) || quantity < 1) continue;
    const sku = skuIdx >= 0 ? cols[skuIdx]?.trim() || "—" : "—";
    out.push({ name, sku, quantity: Math.floor(quantity) });
  }
  return out;
}
