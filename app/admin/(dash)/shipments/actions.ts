"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAuthenticated } from "@/lib/auth";
import { parseCsvShipmentItems } from "@/lib/shipments";
import {
  SHIPMENT_STATUS_FLOW,
  type ShipmentSource,
  type ShipmentStatus,
} from "@/lib/types";

const ALLOWED_DOC_TYPES = [
  "application/pdf",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
  "application/csv",
];
const MAX_DOC_BYTES = 15 * 1024 * 1024;

export type ManualShipmentItemInput = {
  name: string;
  sku: string;
  quantity: number;
  photo_url?: string | null;
};

function parseDate(v: unknown): string | null {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return s.slice(0, 10);
}

function parseItemsJson(raw: unknown): ManualShipmentItemInput[] {
  if (!Array.isArray(raw)) return [];
  const out: ManualShipmentItemInput[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const e = entry as Record<string, unknown>;
    const name = String(e.name ?? "").trim();
    const sku = String(e.sku ?? "").trim();
    const quantity = Number(e.quantity);
    if (!name || !Number.isFinite(quantity) || quantity < 1) continue;
    out.push({
      name,
      sku: sku || "—",
      quantity: Math.floor(quantity),
      photo_url: e.photo_url ? String(e.photo_url) : null,
    });
  }
  return out;
}

async function uploadShipmentDocument(
  file: File
): Promise<{ ok: true; url: string; name: string } | { ok: false; error: string }> {
  if (!ALLOWED_DOC_TYPES.includes(file.type) && !file.name.match(/\.(csv|xlsx|xls|pdf)$/i)) {
    return { ok: false, error: "Unsupported file type (PDF, Excel, or CSV only)" };
  }
  if (file.size > MAX_DOC_BYTES) {
    return { ok: false, error: "File too large (max 15 MB)" };
  }

  const ext = file.name.includes(".")
    ? file.name.split(".").pop()!.toLowerCase()
    : "pdf";
  const path = `${crypto.randomUUID()}.${ext}`;
  const client = createAdminClient();
  const buffer = Buffer.from(await file.arrayBuffer());
  const { error } = await client.storage.from("shipments").upload(path, buffer, {
    contentType: file.type || "application/octet-stream",
    cacheControl: "3600",
    upsert: false,
  });
  if (error) return { ok: false, error: error.message };

  const { data } = client.storage.from("shipments").getPublicUrl(path);
  return { ok: true, url: data.publicUrl, name: file.name };
}

async function insertShipmentWithItems(input: {
  factory_id: string;
  order_date: string;
  expected_arrival_date: string | null;
  source: ShipmentSource;
  notes: string | null;
  attachment_url: string | null;
  attachment_name: string | null;
  items: ManualShipmentItemInput[];
}) {
  const supabase = createAdminClient();
  const { data: shipment, error } = await supabase
    .from("shipments")
    .insert({
      factory_id: input.factory_id,
      order_date: input.order_date,
      expected_arrival_date: input.expected_arrival_date,
      source: input.source,
      notes: input.notes,
      attachment_url: input.attachment_url,
      attachment_name: input.attachment_name,
      status: "ordered",
    })
    .select("id")
    .single();

  if (error || !shipment) {
    return { ok: false as const, error: error?.message ?? "Insert failed" };
  }

  if (input.items.length > 0) {
    const rows = input.items.map((item, idx) => ({
      shipment_id: shipment.id,
      name: item.name,
      sku: item.sku,
      photo_url: item.photo_url ?? null,
      quantity: item.quantity,
      position: idx,
    }));
    const { error: itemsErr } = await supabase
      .from("shipment_items")
      .insert(rows);
    if (itemsErr) return { ok: false as const, error: itemsErr.message };
  }

  return { ok: true as const, id: shipment.id };
}

export async function createManualShipment(
  formData: FormData
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  if (!(await isAuthenticated())) {
    return { ok: false, error: "Unauthorized" };
  }

  const factory_id = String(formData.get("factory_id") ?? "").trim();
  const order_date =
    parseDate(formData.get("order_date")) ??
    new Date().toISOString().slice(0, 10);
  const expected_arrival_date = parseDate(formData.get("expected_arrival_date"));
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!factory_id) return { ok: false, error: "Factory is required" };

  let items: ManualShipmentItemInput[] = [];
  try {
    items = parseItemsJson(
      JSON.parse(String(formData.get("items_json") ?? "[]"))
    );
  } catch {
    return { ok: false, error: "Invalid product lines" };
  }

  let attachment_url: string | null = null;
  let attachment_name: string | null = null;
  let source: ShipmentSource = "manual";

  const file = formData.get("file");
  if (file instanceof File && file.size > 0) {
    const uploaded = await uploadShipmentDocument(file);
    if (!uploaded.ok) return uploaded;
    attachment_url = uploaded.url;
    attachment_name = uploaded.name;
    source = "import";

    if (items.length === 0 && file.name.toLowerCase().endsWith(".csv")) {
      const text = await file.text();
      items = parseCsvShipmentItems(text);
    }
  }

  if (items.length === 0) {
    return {
      ok: false,
      error: "Add at least one product line, or upload a CSV with name and quantity columns.",
    };
  }

  const res = await insertShipmentWithItems({
    factory_id,
    order_date,
    expected_arrival_date,
    source,
    notes,
    attachment_url,
    attachment_name,
    items,
  });

  if (!res.ok) return res;

  revalidatePath("/admin/shipments");
  return { ok: true, id: res.id };
}

export async function setShipmentStatus(
  formData: FormData
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!(await isAuthenticated())) {
    return { ok: false, error: "Unauthorized" };
  }

  const id = String(formData.get("id") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim() as ShipmentStatus;

  if (!id || !SHIPMENT_STATUS_FLOW.includes(status)) {
    return { ok: false, error: "Invalid shipment or status" };
  }

  const supabase = createAdminClient();
  const now = new Date().toISOString();
  const payload: Record<string, string | null> = { status };

  if (status === "received") {
    payload.received_at = now;
    payload.archived_at = now;
  } else {
    payload.received_at = null;
    payload.archived_at = null;
  }

  const { error } = await supabase
    .from("shipments")
    .update(payload)
    .eq("id", id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/shipments");
  revalidatePath(`/admin/shipments/${id}`);
  return { ok: true };
}

export async function setShipmentExpectedDate(
  formData: FormData
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!(await isAuthenticated())) {
    return { ok: false, error: "Unauthorized" };
  }

  const id = String(formData.get("id") ?? "").trim();
  const expected_arrival_date = parseDate(formData.get("expected_arrival_date"));

  if (!id) return { ok: false, error: "Invalid shipment" };

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("shipments")
    .update({ expected_arrival_date })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/shipments");
  revalidatePath(`/admin/shipments/${id}`);
  return { ok: true };
}

export async function uploadShipmentItemPhoto(
  formData: FormData
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  if (!(await isAuthenticated())) {
    return { ok: false, error: "Unauthorized" };
  }
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { ok: false, error: "No file provided" };
  }
  const allowed = ["image/jpeg", "image/png", "image/webp", "image/heic"];
  if (!allowed.includes(file.type)) {
    return { ok: false, error: "Unsupported image type" };
  }
  if (file.size > 10 * 1024 * 1024) {
    return { ok: false, error: "Image too large (max 10 MB)" };
  }
  const ext = file.name.includes(".")
    ? file.name.split(".").pop()!.toLowerCase()
    : "jpg";
  const path = `photos/${crypto.randomUUID()}.${ext}`;
  const client = createAdminClient();
  const buffer = Buffer.from(await file.arrayBuffer());
  const { error } = await client.storage.from("shipments").upload(path, buffer, {
    contentType: file.type,
    cacheControl: "3600",
    upsert: false,
  });
  if (error) return { ok: false, error: error.message };
  const { data } = client.storage.from("shipments").getPublicUrl(path);
  return { ok: true, url: data.publicUrl };
}
