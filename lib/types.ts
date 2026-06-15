export type QuotationStatus = "draft" | "sent" | "closed";
export type PurchaseOrderStatus =
  | "pending"
  | "approved"
  | "in_progress"
  | "sent"
  | "received";

export const PURCHASE_ORDER_STATUS_FLOW: PurchaseOrderStatus[] = [
  "pending",
  "approved",
  "in_progress",
  "sent",
  "received",
];

export const PURCHASE_ORDER_STATUS_LABELS: Record<
  PurchaseOrderStatus,
  string
> = {
  pending: "Pending",
  approved: "Approved",
  in_progress: "In production",
  sent: "Shipped",
  received: "Received",
};

export type ItemSpecs = {
  weight_g?: number | null;
  carats?: number | null;
  gold_type?: string | null;
  stone_type?: string | null;
};

export type Factory = {
  id: string;
  name: string;
  notes: string | null;
  created_at: string;
};

export type Quotation = {
  id: string;
  title: string;
  status: QuotationStatus;
  created_at: string;
  closed_at: string | null;
};

export type Item = {
  id: string;
  quotation_id: string;
  name: string | null;
  sku: string | null;
  description: string | null;
  specs: ItemSpecs | null;
  photo_urls: string[];
  position: number;
  created_at: string;
};

export type ItemVariant = {
  id: string;
  item_assignment_id: string;
  label: string;
  description: string | null;
  position: number;
  created_at: string;
};

export type QuotationFactory = {
  id: string;
  quotation_id: string;
  factory_id: string;
  token: string;
  accepted_at: string | null;
  created_at: string;
};

export type ItemAssignment = {
  id: string;
  quotation_factory_id: string;
  item_id: string;
};

export type Quote = {
  id: string;
  item_assignment_id: string;
  variant_id: string;
  gold_loss: number | null;
  total_gold_cost: number | null;
  diamond_cost: number | null;
  cost_per_carat: number | null;
  labor: number | null;
  other_fees: number | null;
  final_price: number | null;
  declined: boolean;
  notes: string | null;
  karatage: string | null;
  product_description: string | null;
  submitted_at: string;
};

export const KARATAGE_OPTIONS = ["10k", "14k", "18k", "24k"] as const;
export type KaratageOption = (typeof KARATAGE_OPTIONS)[number];

export type PurchaseOrder = {
  id: string;
  quotation_id: string;
  factory_id: string;
  token: string;
  status: PurchaseOrderStatus;
  created_at: string;
  approved_at: string | null;
  in_progress_at: string | null;
  sent_at: string | null;
  received_at: string | null;
};

export type PurchaseOrderItem = {
  id: string;
  purchase_order_id: string;
  item_id: string;
  quote_id: string;
  quantity: number;
};

export const QUOTE_COLUMNS = [
  { key: "gold_loss", label: "Gold loss" },
  { key: "total_gold_cost", label: "Total gold cost" },
  { key: "diamond_cost", label: "Diamond cost" },
  { key: "cost_per_carat", label: "Cost per carat" },
  { key: "labor", label: "Labor" },
  { key: "other_fees", label: "Other fees" },
] as const;

export type QuoteColumnKey = (typeof QUOTE_COLUMNS)[number]["key"];

/**
 * Total = final_price if the factory provided one, otherwise the sum
 * of individual cost columns. A declined quote has no total.
 */
export function quoteTotal(q: Partial<Quote>): number {
  if (q.declined) return 0;
  if (q.final_price !== null && q.final_price !== undefined) {
    return Number(q.final_price) || 0;
  }
  return QUOTE_COLUMNS.reduce((sum, col) => sum + (Number(q[col.key]) || 0), 0);
}

export function quoteHasValue(q: Partial<Quote>): boolean {
  if (q.declined) return false;
  if (q.final_price !== null && q.final_price !== undefined) return true;
  return QUOTE_COLUMNS.some((col) => {
    const v = q[col.key];
    return v !== null && v !== undefined;
  });
}

export type InventoryProduct = {
  id: string;
  factory_id: string;
  sku: string;
  name: string | null;
  description: string | null;
  specs: ItemSpecs | null;
  photo_urls: string[];
  created_at: string;
  updated_at: string;
};

export type InventoryPriceEntry = {
  id: string;
  inventory_product_id: string;
  quotation_id: string;
  purchase_order_id: string;
  unit_price: number;
  quantity: number;
  quote_snapshot: Partial<Quote>;
  ordered_at: string;
};

export type InventoryProductWithHistory = InventoryProduct & {
  price_entries: InventoryPriceEntry[];
};
