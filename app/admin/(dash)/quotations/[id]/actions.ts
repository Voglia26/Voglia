"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAuthenticated } from "@/lib/auth";
import type { ItemSpecs } from "@/lib/types";
import type { VariantDraft } from "@/components/quotations/variants-field";

function parseNumber(v: unknown): number | null {
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
];
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

export async function uploadItemPhoto(
  formData: FormData
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  if (!(await isAuthenticated())) {
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
  const path = `${crypto.randomUUID()}.${ext}`;

  const client = createAdminClient();
  const buffer = Buffer.from(await file.arrayBuffer());
  const { error } = await client.storage
    .from("items")
    .upload(path, buffer, {
      contentType: file.type,
      cacheControl: "3600",
      upsert: false,
    });
  if (error) return { ok: false, error: error.message };

  const { data } = client.storage.from("items").getPublicUrl(path);
  return { ok: true, url: data.publicUrl };
}

function parsePhotoUrls(formData: FormData): string[] {
  return formData
    .getAll("photo_urls")
    .map((v) => String(v).trim())
    .filter(Boolean);
}

function parseVariantsJson(formData: FormData): VariantDraft[] {
  const raw = String(formData.get("variants_json") ?? "").trim();
  if (!raw) return [{ label: "Standard", description: "" }];
  try {
    const parsed = JSON.parse(raw) as VariantDraft[];
    const cleaned = parsed
      .map((v) => ({
        id: v.id,
        label: String(v.label ?? "").trim(),
        description: String(v.description ?? "").trim(),
      }))
      .filter((v) => v.label.length > 0);
    return cleaned.length > 0 ? cleaned : [{ label: "Standard", description: "" }];
  } catch {
    return [{ label: "Standard", description: "" }];
  }
}

async function syncItemVariants(
  client: ReturnType<typeof createAdminClient>,
  itemId: string,
  variants: VariantDraft[]
) {
  const { data: existing } = await client
    .from("item_variants")
    .select("id")
    .eq("item_id", itemId);

  const existingIds = new Set((existing ?? []).map((v) => v.id));
  const keepIds = new Set(
    variants.map((v) => v.id).filter((id): id is string => !!id)
  );

  const toDelete = [...existingIds].filter((id) => !keepIds.has(id));
  if (existing && existing.length - toDelete.length === 0 && variants.length === 0) {
    return;
  }
  if (existing && existing.length - toDelete.length + variants.filter((v) => !v.id).length < 1) {
    return;
  }

  for (const id of toDelete) {
    if ((existing?.length ?? 0) > 1) {
      await client.from("item_variants").delete().eq("id", id);
    }
  }

  for (let i = 0; i < variants.length; i++) {
    const v = variants[i];
    const payload = {
      label: v.label,
      description: v.description || null,
      position: i,
    };
    if (v.id && existingIds.has(v.id)) {
      await client.from("item_variants").update(payload).eq("id", v.id);
    } else {
      await client.from("item_variants").insert({ item_id: itemId, ...payload });
    }
  }
}

export async function addItem(formData: FormData) {
  const quotation_id = String(formData.get("quotation_id") ?? "");
  if (!quotation_id) return;
  const specs: ItemSpecs = {
    weight_g: parseNumber(formData.get("weight_g")),
    carats: parseNumber(formData.get("carats")),
    gold_type: (String(formData.get("gold_type") ?? "").trim() || null),
    stone_type: (String(formData.get("stone_type") ?? "").trim() || null),
  };
  const hasSpecs = Object.values(specs).some((v) => v !== null && v !== "");
  const payload = {
    quotation_id,
    sku: String(formData.get("sku") ?? "").trim() || null,
    name: String(formData.get("name") ?? "").trim() || null,
    description: String(formData.get("description") ?? "").trim() || null,
    photo_urls: parsePhotoUrls(formData),
    specs: hasSpecs ? specs : null,
  };
  const client = createAdminClient();
  const { data: created, error } = await client
    .from("items")
    .insert(payload)
    .select("id")
    .single();
  if (error || !created) return;
  await syncItemVariants(client, created.id, parseVariantsJson(formData));
  revalidatePath(`/admin/quotations/${quotation_id}`);
}

export async function updateItem(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const quotation_id = String(formData.get("quotation_id") ?? "");
  if (!id || !quotation_id) return;
  const specs: ItemSpecs = {
    weight_g: parseNumber(formData.get("weight_g")),
    carats: parseNumber(formData.get("carats")),
    gold_type: (String(formData.get("gold_type") ?? "").trim() || null),
    stone_type: (String(formData.get("stone_type") ?? "").trim() || null),
  };
  const hasSpecs = Object.values(specs).some((v) => v !== null && v !== "");
  const payload = {
    sku: String(formData.get("sku") ?? "").trim() || null,
    name: String(formData.get("name") ?? "").trim() || null,
    description: String(formData.get("description") ?? "").trim() || null,
    photo_urls: parsePhotoUrls(formData),
    specs: hasSpecs ? specs : null,
  };
  const client = createAdminClient();
  await client.from("items").update(payload).eq("id", id);
  await syncItemVariants(client, id, parseVariantsJson(formData));
  revalidatePath(`/admin/quotations/${quotation_id}`);
}

export async function deleteItem(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const quotation_id = String(formData.get("quotation_id") ?? "");
  if (!id) return;
  const client = createAdminClient();
  await client.from("items").delete().eq("id", id);
  revalidatePath(`/admin/quotations/${quotation_id}`);
}

export async function toggleAssignment(
  quotation_id: string,
  factory_id: string,
  item_id: string,
  assigned: boolean
) {
  const client = createAdminClient();

  let { data: qf } = await client
    .from("quotation_factories")
    .select("id")
    .eq("quotation_id", quotation_id)
    .eq("factory_id", factory_id)
    .maybeSingle();

  if (!qf) {
    const { data: created } = await client
      .from("quotation_factories")
      .insert({ quotation_id, factory_id })
      .select("id")
      .single();
    qf = created;
  }
  if (!qf) return;

  if (assigned) {
    await client
      .from("item_assignments")
      .insert({ quotation_factory_id: qf.id, item_id });
  } else {
    await client
      .from("item_assignments")
      .delete()
      .eq("quotation_factory_id", qf.id)
      .eq("item_id", item_id);
    const { count } = await client
      .from("item_assignments")
      .select("id", { count: "exact", head: true })
      .eq("quotation_factory_id", qf.id);
    if ((count ?? 0) === 0) {
      await client.from("quotation_factories").delete().eq("id", qf.id);
    }
  }
  revalidatePath(`/admin/quotations/${quotation_id}`);
}

export async function sendQuotation(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const client = createAdminClient();
  await client.from("quotations").update({ status: "sent" }).eq("id", id);
  revalidatePath(`/admin/quotations/${id}`);
}

export async function deleteQuotation(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const client = createAdminClient();
  await client.from("quotations").delete().eq("id", id);
  revalidatePath("/admin/quotations");
  redirect("/admin/quotations");
}
