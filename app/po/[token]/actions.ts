"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PurchaseOrderStatus } from "@/lib/types";
import { PURCHASE_ORDER_STATUS_FLOW } from "@/lib/types";

// Only allow forward transitions along the flow. Received is terminal and can
// only be set by the admin from their dashboard.
const FACTORY_ALLOWED: PurchaseOrderStatus[] = [
  "approved",
  "in_progress",
  "sent",
];

export async function advancePOStatus(
  token: string,
  next: PurchaseOrderStatus
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!FACTORY_ALLOWED.includes(next)) {
    return { ok: false, error: "Not allowed" };
  }
  const supabase = createAdminClient();
  const { data: po } = await supabase
    .from("purchase_orders")
    .select("id, status")
    .eq("token", token)
    .maybeSingle();

  if (!po) return { ok: false, error: "Not found" };

  const currentIdx = PURCHASE_ORDER_STATUS_FLOW.indexOf(po.status);
  const nextIdx = PURCHASE_ORDER_STATUS_FLOW.indexOf(next);
  if (nextIdx <= currentIdx) {
    return { ok: false, error: "Cannot move backwards" };
  }

  const timestampField =
    next === "approved"
      ? "approved_at"
      : next === "in_progress"
        ? "in_progress_at"
        : next === "sent"
          ? "sent_at"
          : null;

  const patch: Record<string, unknown> = { status: next };
  if (timestampField) patch[timestampField] = new Date().toISOString();

  const { error } = await supabase
    .from("purchase_orders")
    .update(patch)
    .eq("id", po.id);

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/po/${token}`);
  revalidatePath("/admin/purchase-orders");
  revalidatePath(`/admin/purchase-orders/${po.id}`);
  return { ok: true };
}
