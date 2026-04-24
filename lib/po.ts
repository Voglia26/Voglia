import { createAdminClient } from "@/lib/supabase/admin";
import type { Item, Quote, PurchaseOrder, Factory, Quotation } from "@/lib/types";

export type POItemDetail = {
  id: string;
  quantity: number;
  item: Item;
  quote: Quote;
};

export type POView = {
  po: PurchaseOrder;
  factory: Factory;
  quotation: Quotation;
  items: POItemDetail[];
};

export async function loadPurchaseOrderByToken(
  token: string
): Promise<POView | null> {
  return loadPurchaseOrder({ token });
}

export async function loadPurchaseOrderById(
  id: string
): Promise<POView | null> {
  return loadPurchaseOrder({ id });
}

async function loadPurchaseOrder(
  where: { id?: string; token?: string }
): Promise<POView | null> {
  const supabase = createAdminClient();
  let query = supabase
    .from("purchase_orders")
    .select(
      "*, factory:factories(*), quotation:quotations(*), purchase_order_items(id, quantity, item:items(*), quote:quotes(*))"
    );
  if (where.id) query = query.eq("id", where.id);
  if (where.token) query = query.eq("token", where.token);

  const { data } = await query.maybeSingle();
  if (!data) return null;

  type Row = PurchaseOrder & {
    factory: Factory | Factory[];
    quotation: Quotation | Quotation[];
    purchase_order_items: {
      id: string;
      quantity: number;
      item: Item | Item[];
      quote: Quote | Quote[];
    }[];
  };
  const row = data as unknown as Row;
  const factory = Array.isArray(row.factory) ? row.factory[0] : row.factory;
  const quotation = Array.isArray(row.quotation)
    ? row.quotation[0]
    : row.quotation;
  const items: POItemDetail[] = row.purchase_order_items.map((p) => ({
    id: p.id,
    quantity: p.quantity,
    item: Array.isArray(p.item) ? p.item[0] : p.item,
    quote: Array.isArray(p.quote) ? p.quote[0] : p.quote,
  }));

  const { factory: _f, quotation: _q, purchase_order_items: _pi, ...po } = row;
  return { po: po as PurchaseOrder, factory, quotation, items };
}
