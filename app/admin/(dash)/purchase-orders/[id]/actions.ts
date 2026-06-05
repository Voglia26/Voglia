"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { PURCHASE_ORDER_STATUS_FLOW, type PurchaseOrderStatus } from "@/lib/types";

export async function setPurchaseOrderStatus(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const next = String(formData.get("status") ?? "") as PurchaseOrderStatus;
  if (!id || !PURCHASE_ORDER_STATUS_FLOW.includes(next)) return;

  const timestampField =
    next === "approved"
      ? "approved_at"
      : next === "in_progress"
        ? "in_progress_at"
        : next === "sent"
          ? "sent_at"
          : next === "received"
            ? "received_at"
            : null;

  const patch: Record<string, unknown> = { status: next };
  if (next === "pending") {
    patch.approved_at = null;
    patch.in_progress_at = null;
    patch.sent_at = null;
    patch.received_at = null;
  } else if (timestampField) {
    patch[timestampField] = new Date().toISOString();
  }

  const supabase = createAdminClient();
  await supabase.from("purchase_orders").update(patch).eq("id", id);
  revalidatePath("/admin/purchase-orders");
  revalidatePath(`/admin/purchase-orders/${id}`);
}

export async function deletePurchaseOrder(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const supabase = createAdminClient();
  await supabase.from("purchase_orders").delete().eq("id", id);
  revalidatePath("/admin/purchase-orders");
  redirect("/admin/purchase-orders");
}
