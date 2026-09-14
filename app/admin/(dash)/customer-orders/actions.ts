"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";
import { canGenerateCustomerPurchaseOrder } from "@/lib/types";
import type { CustomerOrder } from "@/lib/types";

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
      factory_id: co.factory_id,
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
