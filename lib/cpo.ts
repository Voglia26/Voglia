import { createAdminClient } from "@/lib/supabase/admin";
import type {
  CustomerOrder,
  CustomerPurchaseOrder,
  Factory,
} from "@/lib/types";

export type CustomerPOView = {
  cpo: CustomerPurchaseOrder;
  factory: Factory;
  order: CustomerOrder;
};

export async function loadCustomerPurchaseOrderByToken(
  token: string
): Promise<CustomerPOView | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("customer_purchase_orders")
    .select(
      "*, factory:factories(*), customer_order:customer_orders(*)"
    )
    .eq("token", token)
    .maybeSingle();

  if (!data) return null;

  type Row = CustomerPurchaseOrder & {
    factory: Factory | Factory[];
    customer_order: CustomerOrder | CustomerOrder[];
  };
  const row = data as unknown as Row;
  const factory = Array.isArray(row.factory) ? row.factory[0] : row.factory;
  const order = Array.isArray(row.customer_order)
    ? row.customer_order[0]
    : row.customer_order;
  if (!factory || !order) return null;

  const { factory: _f, customer_order: _o, ...cpo } = row;

  return {
    cpo: cpo as CustomerPurchaseOrder,
    factory,
    order,
  };
}

export async function loadCustomerPurchaseOrderById(
  id: string
): Promise<CustomerPOView | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("customer_purchase_orders")
    .select(
      "*, factory:factories(*), customer_order:customer_orders(*)"
    )
    .eq("id", id)
    .maybeSingle();

  if (!data) return null;

  type Row = CustomerPurchaseOrder & {
    factory: Factory | Factory[];
    customer_order: CustomerOrder | CustomerOrder[];
  };
  const row = data as unknown as Row;
  const factory = Array.isArray(row.factory) ? row.factory[0] : row.factory;
  const order = Array.isArray(row.customer_order)
    ? row.customer_order[0]
    : row.customer_order;
  if (!factory || !order) return null;

  const { factory: _f, customer_order: _o, ...cpo } = row;
  return { cpo: cpo as CustomerPurchaseOrder, factory, order };
}
