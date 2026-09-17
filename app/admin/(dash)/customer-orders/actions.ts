"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";
import {
  CUSTOMER_ORDER_ADMIN_STATUSES,
  canGenerateCustomerPurchaseOrder,
  type CustomerOrder,
  type CustomerOrderStatus,
} from "@/lib/types";

const NEW_FACTORY_OPTION = "__new__";

function normalizeFactoryName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

async function resolveFactoryId(
  formData: FormData
): Promise<string | null> {
  const factoryId = String(formData.get("factory_id") ?? "").trim();
  const newName = normalizeFactoryName(
    String(formData.get("factory_name_new") ?? "")
  );
  const client = createAdminClient();

  if (factoryId && factoryId !== NEW_FACTORY_OPTION) {
    const { data } = await client
      .from("factories")
      .select("id")
      .eq("id", factoryId)
      .maybeSingle();
    return data?.id ?? null;
  }

  if (!newName) return null;

  const { data: existing } = await client.from("factories").select("id, name");
  const match = (existing ?? []).find(
    (f) => normalizeFactoryName(f.name).toLowerCase() === newName.toLowerCase()
  );
  if (match) return match.id;

  const { data: created, error } = await client
    .from("factories")
    .insert({ name: newName })
    .select("id")
    .single();
  if (error || !created) return null;

  revalidatePath("/admin/factories");
  return created.id;
}

export async function updateAdminCustomerOrder(
  formData: FormData
): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "Unauthorized" };

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { ok: false, error: "Pedido inválido" };

  const supabase = createAdminClient();
  const { data: existing } = await supabase
    .from("customer_orders")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!existing) return { ok: false, error: "Pedido no encontrado" };
  if (existing.status === "cancelled") {
    return { ok: false, error: "Pedido cancelado" };
  }

  const statusValue = String(formData.get("status_value") ?? "").trim();
  let status: CustomerOrderStatus = existing.status as CustomerOrderStatus;
  let custom_status_id: string | null = null;

  if (statusValue.startsWith("custom:")) {
    const customId = statusValue.slice("custom:".length);
    const { data: custom } = await supabase
      .from("customer_order_custom_statuses")
      .select("id")
      .eq("id", customId)
      .eq("active", true)
      .maybeSingle();
    if (!custom) return { ok: false, error: "Estado personalizado inválido" };
    custom_status_id = custom.id;
    // Keep a base status for filters; default to ordered when using custom
    status =
      existing.status === "pending_order" || existing.status === "ordered"
        ? (existing.status as CustomerOrderStatus)
        : "ordered";
  } else if (
    CUSTOMER_ORDER_ADMIN_STATUSES.includes(statusValue as CustomerOrderStatus)
  ) {
    status = statusValue as CustomerOrderStatus;
    custom_status_id = null;
  } else {
    return { ok: false, error: "Estado inválido" };
  }

  const factory_id = await resolveFactoryId(formData);
  if (!factory_id) {
    return { ok: false, error: "Seleccioná o creá un proveedor" };
  }

  const lightspeed_sku =
    String(formData.get("lightspeed_sku") ?? "").trim() || null;

  const { error } = await supabase
    .from("customer_orders")
    .update({
      factory_id,
      status,
      custom_status_id,
      lightspeed_sku,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/customer-orders");
  revalidatePath(`/admin/customer-orders/${id}`);
  revalidatePath("/seller");
  revalidatePath(`/seller/orders/${id}`);
  return { ok: true };
}

export async function createCustomOrderStatus(
  formData: FormData
): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "Unauthorized" };

  const label = String(formData.get("label") ?? "").trim();
  if (!label) return { ok: false, error: "Escribí un nombre de estado" };

  const supabase = createAdminClient();
  const { data: existing } = await supabase
    .from("customer_order_custom_statuses")
    .select("id, label, active");

  const match = (existing ?? []).find(
    (s) => s.label.trim().toLowerCase() === label.toLowerCase()
  );
  if (match) {
    if (!match.active) {
      await supabase
        .from("customer_order_custom_statuses")
        .update({ active: true })
        .eq("id", match.id);
      revalidatePath("/admin/customer-orders");
      return { ok: true };
    }
    return { ok: false, error: "Ese estado ya existe" };
  }

  const { error } = await supabase
    .from("customer_order_custom_statuses")
    .insert({ label, active: true });

  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/customer-orders");
  revalidatePath(`/admin/customer-orders`);
  return { ok: true };
}

export async function setCustomOrderStatusActive(
  id: string,
  active: boolean
): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "Unauthorized" };

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("customer_order_custom_statuses")
    .update({ active })
    .eq("id", id.trim());

  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/customer-orders");
  return { ok: true };
}

export async function generateCustomerPurchaseOrder(
  customerOrderId: string
): Promise<
  | { ok: true; token: string; id: string }
  | { ok: false; error: string }
> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "Unauthorized" };

  const id = customerOrderId.trim();
  if (!id) return { ok: false, error: "Pedido inválido" };

  const supabase = createAdminClient();
  const { data: order, error: loadErr } = await supabase
    .from("customer_orders")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (loadErr) return { ok: false, error: loadErr.message };
  if (!order) return { ok: false, error: "Pedido no encontrado" };

  const co = order as CustomerOrder;
  if (!canGenerateCustomerPurchaseOrder(co)) {
    if (co.status === "cancelled") {
      return { ok: false, error: "No se puede generar PO de un pedido cancelado" };
    }
    if (co.customer_purchase_order_id) {
      return { ok: false, error: "Este pedido ya tiene Purchase Order" };
    }
    return { ok: false, error: "Falta proveedor en el pedido" };
  }

  const { data: cpo, error: insertErr } = await supabase
    .from("customer_purchase_orders")
    .insert({
      customer_order_id: co.id,
      factory_id: co.factory_id!,
      quantity: 1,
      created_by: admin.id,
    })
    .select("id, token")
    .single();

  if (insertErr || !cpo) {
    return { ok: false, error: insertErr?.message ?? "No se pudo crear la PO" };
  }

  const { error: linkErr } = await supabase
    .from("customer_orders")
    .update({
      customer_purchase_order_id: cpo.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", co.id);

  if (linkErr) {
    await supabase.from("customer_purchase_orders").delete().eq("id", cpo.id);
    return { ok: false, error: linkErr.message };
  }

  revalidatePath("/admin/customer-orders");
  revalidatePath(`/admin/customer-orders/${co.id}`);
  revalidatePath("/seller");
  revalidatePath(`/seller/orders/${co.id}`);

  return { ok: true, token: cpo.token, id: cpo.id };
}
