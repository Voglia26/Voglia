"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSession, requireSeller } from "@/lib/auth";
import {
  DIAMOND_SHAPE_OPTIONS,
  GEMSTONE_TYPE_OPTIONS,
  GOLD_COLOR_OPTIONS,
} from "@/lib/types";

const GOLD_COLORS = new Set<string>(GOLD_COLOR_OPTIONS);
const DIAMOND_SHAPES = new Set<string>(DIAMOND_SHAPE_OPTIONS);
const GEMSTONE_TYPES = new Set<string>(GEMSTONE_TYPE_OPTIONS);

function parseOptionalSelect(
  value: unknown,
  allowed: Set<string>
): string | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  return allowed.has(raw) ? raw : null;
}

function parseOptionalText(value: unknown): string | null {
  const raw = String(value ?? "").trim();
  return raw || null;
}

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
];
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

function parseDate(value: unknown): string | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  return raw;
}

function parseBool(value: unknown): boolean {
  const v = String(value ?? "");
  return v === "on" || v === "true" || v === "1";
}

export async function uploadCustomerOrderPhoto(
  formData: FormData
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const session = await getSession();
  if (!session || (session.role !== "seller" && session.role !== "admin")) {
    return { ok: false, error: "Unauthorized" };
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { ok: false, error: "No file provided" };
  }
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return { ok: false, error: "Unsupported image type" };
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return { ok: false, error: "Image too large (max 10 MB)" };
  }

  const ext = file.name.includes(".")
    ? file.name.split(".").pop()!.toLowerCase()
    : "jpg";
  const path = `customer-orders/${crypto.randomUUID()}.${ext}`;

  const client = createAdminClient();
  const buffer = Buffer.from(await file.arrayBuffer());
  const { error } = await client.storage.from("items").upload(path, buffer, {
    contentType: file.type,
    cacheControl: "3600",
    upsert: false,
  });
  if (error) return { ok: false, error: error.message };

  const { data } = client.storage.from("items").getPublicUrl(path);
  return { ok: true, url: data.publicUrl };
}

export async function createCustomerOrder(formData: FormData) {
  const session = await requireSeller();
  if (!session || session.role !== "seller") {
    redirect("/login");
  }

  const product_name = String(formData.get("product_name") ?? "").trim();
  const customer_name = String(formData.get("customer_name") ?? "").trim();
  const ordered_at =
    parseDate(formData.get("ordered_at")) ??
    new Date().toISOString().slice(0, 10);

  if (!product_name || !customer_name) {
    redirect("/seller/orders/new?error=missing");
  }

  const payload = {
    seller_id: session.id,
    product_name,
    notes: parseOptionalText(formData.get("notes")),
    photo_url: parseOptionalText(formData.get("photo_url")),
    customer_name,
    ordered_at,
    lightspeed_sku: parseOptionalText(formData.get("lightspeed_sku")),
    provider_sku: parseOptionalText(formData.get("provider_sku")),
    gold_color: parseOptionalSelect(formData.get("gold_color"), GOLD_COLORS),
    diamond_shape: parseOptionalSelect(
      formData.get("diamond_shape"),
      DIAMOND_SHAPES
    ),
    gemstone_type: parseOptionalSelect(
      formData.get("gemstone_type"),
      GEMSTONE_TYPES
    ),
    size: parseOptionalText(formData.get("size")),
    factory_id: null,
    due_date: parseDate(formData.get("due_date")),
    is_urgent: parseBool(formData.get("is_urgent")),
    is_restock: parseBool(formData.get("is_restock")),
    status: "pending_order" as const,
    custom_status_id: null,
    updated_at: new Date().toISOString(),
  };

  const client = createAdminClient();
  const { data, error } = await client
    .from("customer_orders")
    .insert(payload)
    .select("id")
    .single();

  if (error || !data) {
    redirect("/seller/orders/new?error=save");
  }

  revalidatePath("/seller");
  revalidatePath("/admin/customer-orders");
  redirect(`/seller/orders/${data.id}`);
}

export async function updateCustomerOrder(formData: FormData) {
  const session = await requireSeller();
  if (!session || session.role !== "seller") {
    redirect("/login");
  }

  const id = String(formData.get("id") ?? "").trim();
  if (!id) redirect("/seller");

  const client = createAdminClient();
  const { data: existing } = await client
    .from("customer_orders")
    .select("*")
    .eq("id", id)
    .eq("seller_id", session.id)
    .maybeSingle();

  if (!existing) redirect("/seller");

  if (existing.status === "cancelled") {
    redirect(`/seller/orders/${id}`);
  }

  const locked = !!existing.customer_purchase_order_id;

  const patch: Record<string, unknown> = {
    arrived_panama_at: parseDate(formData.get("arrived_panama_at")),
    delivered_at: parseDate(formData.get("delivered_at")),
    notes: String(formData.get("notes") ?? "").trim() || null,
    customer_name:
      String(formData.get("customer_name") ?? "").trim() ||
      existing.customer_name,
    due_date: parseDate(formData.get("due_date")),
    is_urgent: parseBool(formData.get("is_urgent")),
    is_restock: parseBool(formData.get("is_restock")),
    ordered_at: parseDate(formData.get("ordered_at")) ?? existing.ordered_at,
    photo_url: String(formData.get("photo_url") ?? "").trim() || null,
    // Lightspeed SKU stays editable even after PO lock
    lightspeed_sku: parseOptionalText(formData.get("lightspeed_sku")),
    updated_at: new Date().toISOString(),
  };

  if (!locked) {
    const product_name = String(formData.get("product_name") ?? "").trim();
    if (product_name) patch.product_name = product_name;
    patch.provider_sku = parseOptionalText(formData.get("provider_sku"));
    patch.gold_color = parseOptionalSelect(
      formData.get("gold_color"),
      GOLD_COLORS
    );
    patch.diamond_shape = parseOptionalSelect(
      formData.get("diamond_shape"),
      DIAMOND_SHAPES
    );
    patch.gemstone_type = parseOptionalSelect(
      formData.get("gemstone_type"),
      GEMSTONE_TYPES
    );
    patch.size = parseOptionalText(formData.get("size"));
  }

  await client.from("customer_orders").update(patch).eq("id", id);

  revalidatePath("/seller");
  revalidatePath(`/seller/orders/${id}`);
  revalidatePath("/admin/customer-orders");
  revalidatePath(`/admin/customer-orders/${id}`);
  redirect(`/seller/orders/${id}`);
}

export async function cancelCustomerOrder(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) redirect("/login");

  const session = await getSession();
  if (!session) redirect("/login");

  const client = createAdminClient();
  const { data: existing } = await client
    .from("customer_orders")
    .select("id, seller_id, status")
    .eq("id", id)
    .maybeSingle();

  if (!existing) {
    redirect(session.role === "admin" ? "/admin/customer-orders" : "/seller");
  }

  const isOwner =
    session.role === "seller" && existing.seller_id === session.id;
  const isAdminUser = session.role === "admin";
  if (!isOwner && !isAdminUser) {
    redirect("/login");
  }

  if (existing.status !== "cancelled") {
    await client
      .from("customer_orders")
      .update({
        status: "cancelled",
        custom_status_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
  }

  revalidatePath("/seller");
  revalidatePath(`/seller/orders/${id}`);
  revalidatePath("/admin/customer-orders");
  revalidatePath(`/admin/customer-orders/${id}`);

  if (session.role === "admin") {
    redirect(`/admin/customer-orders/${id}`);
  }
  redirect(`/seller/orders/${id}`);
}
