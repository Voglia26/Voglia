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

export type ShipmentStatus =
  | "ordered"
  | "in_transit"
  | "in_customs"
  | "received";

export type ShipmentSource = "purchase_order" | "manual" | "import";

export const SHIPMENT_STATUS_FLOW: ShipmentStatus[] = [
  "ordered",
  "in_transit",
  "in_customs",
  "received",
];

export const SHIPMENT_STATUS_LABELS: Record<ShipmentStatus, string> = {
  ordered: "Ordered",
  in_transit: "In Transit",
  in_customs: "In Customs",
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
  item_id: string | null;
  item_assignment_id: string | null;
  label: string;
  description: string | null;
  position: number;
  created_at: string;
};

export type ItemWithVariants = Item & {
  reference_variants: ItemVariant[];
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

export type QuoteStoneLine = {
  label: string;
  cost_per_carat: number;
  total_carats: number;
};

export type Quote = {
  id: string;
  item_assignment_id: string;
  variant_id: string;
  gold_loss: number | null;
  gold_loss_percent: number | null;
  gold_weight_g: number | null;
  gold_loss_g: number | null;
  total_gold_cost: number | null;
  diamond_cost: number | null;
  cost_per_carat: number | null;
  total_carats: number | null;
  stone_lines?: QuoteStoneLine[] | null;
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

export type Shipment = {
  id: string;
  purchase_order_id: string | null;
  factory_id: string;
  status: ShipmentStatus;
  order_date: string;
  expected_arrival_date: string | null;
  received_at: string | null;
  archived_at: string | null;
  source: ShipmentSource;
  attachment_url: string | null;
  attachment_name: string | null;
  notes: string | null;
  created_at: string;
};

export type ShipmentItem = {
  id: string;
  shipment_id: string;
  purchase_order_item_id: string | null;
  name: string | null;
  sku: string | null;
  photo_url: string | null;
  quantity: number;
  position: number;
};

export const QUOTE_COLUMNS = [
  { key: "gold_loss", label: "Gold loss" },
  { key: "total_gold_cost", label: "Total gold cost" },
  { key: "diamond_cost", label: "Diamond cost" },
  { key: "cost_per_carat", label: "Cost per carat" },
  { key: "total_carats", label: "Total carats" },
  { key: "labor", label: "Labor" },
  { key: "other_fees", label: "Other fees" },
] as const;

export type QuoteColumnKey = (typeof QUOTE_COLUMNS)[number]["key"];

/** Columns summed into the unit total (gold loss and diamond cost resolved separately). */
export const QUOTE_TOTAL_SUM_KEYS = [
  "total_gold_cost",
  "labor",
  "other_fees",
] as const;

export function quoteUsesGoldLossPercent(q: Partial<Quote>): boolean {
  const percent = q.gold_loss_percent;
  return (
    percent !== null &&
    percent !== undefined &&
    String(percent).trim() !== "" &&
    Number.isFinite(Number(percent))
  );
}

export function resolveGoldLoss(q: Partial<Quote>): number {
  const percent = q.gold_loss_percent;
  const goldCost = q.total_gold_cost;
  if (
    percent !== null &&
    percent !== undefined &&
    goldCost !== null &&
    goldCost !== undefined &&
    Number.isFinite(Number(percent)) &&
    Number.isFinite(Number(goldCost))
  ) {
    return Number(goldCost) * (Number(percent) / 100);
  }
  return Number(q.gold_loss) || 0;
}

export function quoteGoldGrams(
  q: Partial<Quote>,
  refWeightG?: number | null
): {
  weightG: number | null;
  lossG: number | null;
} {
  let weightG =
    q.gold_weight_g !== null &&
    q.gold_weight_g !== undefined &&
    Number.isFinite(Number(q.gold_weight_g))
      ? Number(q.gold_weight_g)
      : null;
  let lossG =
    q.gold_loss_g !== null &&
    q.gold_loss_g !== undefined &&
    Number.isFinite(Number(q.gold_loss_g))
      ? Number(q.gold_loss_g)
      : null;

  // Legacy: loss in grams stored in gold_loss before gold_loss_g column
  if (lossG === null && !quoteUsesGoldLossPercent(q)) {
    const legacy = q.gold_loss;
    if (
      legacy !== null &&
      legacy !== undefined &&
      Number.isFinite(Number(legacy)) &&
      Number(legacy) > 0 &&
      Number(legacy) <= 100
    ) {
      lossG = Number(legacy);
    }
  }

  if (
    weightG === null &&
    refWeightG !== null &&
    refWeightG !== undefined &&
    Number.isFinite(Number(refWeightG))
  ) {
    weightG = Number(refWeightG);
  }

  return { weightG, lossG };
}

export function formatGramsLabel(
  weightG: number | null,
  lossG: number | null
): string | null {
  const parts: string[] = [];
  if (weightG !== null) parts.push(`${fmtGram(weightG)}g`);
  if (lossG !== null) parts.push(`loss ${fmtGram(lossG)}g`);
  return parts.length > 0 ? parts.join(" · ") : null;
}

export function formatQuoteGrams(
  q: Partial<Quote>,
  refWeightG?: number | null
): string | null {
  const { weightG, lossG } = quoteGoldGrams(q, refWeightG);
  return formatGramsLabel(weightG, lossG);
}

function fmtGram(n: number): string {
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

/** Reference total carats from item specs (`specs.carats`). */
export function itemRefCarats(item: {
  specs?: ItemSpecs | null;
}): number | null {
  const carats = item.specs?.carats;
  if (
    carats === null ||
    carats === undefined ||
    !Number.isFinite(Number(carats)) ||
    Number(carats) <= 0
  ) {
    return null;
  }
  return Number(carats);
}

/** Quote total ÷ item reference carats → "$X.XX/ct", or null if no carats. */
export function formatQuoteCostPerCarat(
  total: number,
  refCarats: number | null
): string | null {
  if (
    refCarats === null ||
    refCarats <= 0 ||
    !Number.isFinite(total) ||
    total <= 0
  ) {
    return null;
  }
  const per = total / refCarats;
  return `$${per.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}/ct`;
}

export function normalizeStoneLines(raw: unknown): QuoteStoneLine[] {
  if (!Array.isArray(raw)) return [];
  const out: QuoteStoneLine[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const e = entry as Record<string, unknown>;
    const label = String(e.label ?? "").trim();
    const per = Number(e.cost_per_carat);
    const carats = Number(e.total_carats);
    if (!label || !Number.isFinite(per) || !Number.isFinite(carats)) continue;
    out.push({ label, cost_per_carat: per, total_carats: carats });
  }
  return out;
}

export function stoneLineCost(line: Partial<QuoteStoneLine>): number {
  const per = line.cost_per_carat;
  const carats = line.total_carats;
  if (
    per !== null &&
    per !== undefined &&
    carats !== null &&
    carats !== undefined &&
    Number.isFinite(Number(per)) &&
    Number.isFinite(Number(carats))
  ) {
    return Number(per) * Number(carats);
  }
  return 0;
}

export function resolveDiamondCost(q: Partial<Quote>): number {
  const lines = normalizeStoneLines(q.stone_lines);
  if (lines.length > 0) {
    return lines.reduce((sum, line) => sum + stoneLineCost(line), 0);
  }
  const per = q.cost_per_carat;
  const carats = q.total_carats;
  if (
    per !== null &&
    per !== undefined &&
    carats !== null &&
    carats !== undefined &&
    Number.isFinite(Number(per)) &&
    Number.isFinite(Number(carats))
  ) {
    return Number(per) * Number(carats);
  }
  return Number(q.diamond_cost) || 0;
}

export function quoteUsesCaratCalculation(q: Partial<Quote>): boolean {
  const lines = normalizeStoneLines(q.stone_lines);
  if (lines.length > 0) return true;
  const per = q.cost_per_carat;
  const carats = q.total_carats;
  return (
    per !== null &&
    per !== undefined &&
    carats !== null &&
    carats !== undefined &&
    String(per).trim() !== "" &&
    String(carats).trim() !== "" &&
    Number.isFinite(Number(per)) &&
    Number.isFinite(Number(carats))
  );
}

/**
 * Total = final_price if the factory provided one, otherwise the sum
 * of individual cost columns. A declined quote has no total.
 */
export function quoteTotal(q: Partial<Quote>): number {
  if (q.declined) return 0;
  if (q.final_price !== null && q.final_price !== undefined) {
    return Number(q.final_price) || 0;
  }
  const parts = QUOTE_TOTAL_SUM_KEYS.reduce(
    (sum, key) => sum + (Number(q[key]) || 0),
    0
  );
  return parts + resolveGoldLoss(q) + resolveDiamondCost(q);
}

export function quoteHasValue(q: Partial<Quote>): boolean {
  if (q.declined) return false;
  if (q.final_price !== null && q.final_price !== undefined) return true;
  if (quoteUsesGoldLossPercent(q)) return true;
  if (quoteUsesCaratCalculation(q)) return true;
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
