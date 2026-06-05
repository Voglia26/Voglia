"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAuthenticated } from "@/lib/auth";

export async function createQuotationFromInventory(
  inventoryProductId: string
): Promise<{ ok: false; error: string } | never> {
  if (!(await isAuthenticated())) {
    return { ok: false, error: "Unauthorized" };
  }

  const client = createAdminClient();
  const { data: product, error: productErr } = await client
    .from("inventory_products")
    .select("*")
    .eq("id", inventoryProductId)
    .maybeSingle();

  if (productErr || !product) {
    return { ok: false, error: productErr?.message ?? "Product not found" };
  }

  const title = product.name
    ? `Reorden — ${product.name}`
    : `Reorden — ${product.sku}`;

  const { data: quotation, error: qErr } = await client
    .from("quotations")
    .insert({ title })
    .select("id")
    .single();

  if (qErr || !quotation) {
    return { ok: false, error: qErr?.message ?? "Could not create quotation" };
  }

  const { data: item, error: itemErr } = await client
    .from("items")
    .insert({
      quotation_id: quotation.id,
      sku: product.sku,
      name: product.name,
      description: product.description,
      specs: product.specs,
      photo_urls: product.photo_urls ?? [],
    })
    .select("id")
    .single();

  if (itemErr || !item) {
    return { ok: false, error: itemErr?.message ?? "Could not create item" };
  }

  const { data: qf, error: qfErr } = await client
    .from("quotation_factories")
    .insert({
      quotation_id: quotation.id,
      factory_id: product.factory_id,
    })
    .select("id")
    .single();

  if (qfErr || !qf) {
    return { ok: false, error: qfErr?.message ?? "Could not assign factory" };
  }

  const { error: assignErr } = await client.from("item_assignments").insert({
    quotation_factory_id: qf.id,
    item_id: item.id,
  });

  if (assignErr) {
    return { ok: false, error: assignErr.message };
  }

  revalidatePath("/admin/inventory");
  revalidatePath("/admin/quotations");
  redirect(`/admin/quotations/${quotation.id}`);
}
