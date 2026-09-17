"use client";

import type { Factory } from "@/lib/types";
import {
  CUSTOMER_ORDER_EDITABLE_STATUSES,
  CUSTOMER_ORDER_STATUS_LABELS,
  DIAMOND_SHAPE_OPTIONS,
  GEMSTONE_TYPE_OPTIONS,
  GOLD_COLOR_OPTIONS,
  isCustomerOrderLocked,
  type CustomerOrder,
} from "@/lib/types";
import { CustomerOrderPhotoField } from "@/components/customer-orders/photo-field";
import { CancelCustomerOrderButton } from "@/components/customer-orders/cancel-button";
import { FactorySelectField } from "@/components/customer-orders/factory-select-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const selectClassName =
  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 disabled:opacity-50";

export function CustomerOrderForm({
  factories,
  order,
  action,
  submitLabel,
  defaultOrderedAt,
}: {
  factories: Pick<Factory, "id" | "name">[];
  order?: CustomerOrder | null;
  action: (formData: FormData) => Promise<void>;
  submitLabel: string;
  /** Server-provided YYYY-MM-DD for new orders (avoids hydration mismatch). */
  defaultOrderedAt?: string;
}) {
  const locked = order ? isCustomerOrderLocked(order) : false;
  const orderedAtDefault =
    order?.ordered_at?.slice(0, 10) ?? defaultOrderedAt ?? "";

  return (
    <div className="space-y-6 max-w-xl">
      <form action={action} className="space-y-6">
        {order ? <input type="hidden" name="id" value={order.id} /> : null}

        {locked && (
          <p className="text-sm rounded-lg border border-amber-300/70 bg-amber-50 px-3 py-2 text-amber-950 dark:bg-amber-950/30 dark:text-amber-100 dark:border-amber-900">
            Este pedido ya tiene Purchase Order. Producto, proveedor, SKUs y
            características del producto no se pueden editar. Sí puedes
            actualizar estado y fechas.
          </p>
        )}

        <div className="space-y-2">
          <Label htmlFor="product_name">Producto / descripción</Label>
          <Input
            id="product_name"
            name="product_name"
            required
            disabled={locked}
            defaultValue={order?.product_name ?? ""}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Características adicionales</Label>
          <Textarea
            id="notes"
            name="notes"
            rows={4}
            placeholder="Detalles extras que no cubren los campos de abajo…"
            defaultValue={order?.notes ?? ""}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="gold_color">Color de oro</Label>
            <select
              id="gold_color"
              name="gold_color"
              disabled={locked}
              defaultValue={order?.gold_color ?? ""}
              className={selectClassName}
            >
              <option value="">Sin especificar</option>
              {GOLD_COLOR_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="diamond_shape">Forma del diamante</Label>
            <select
              id="diamond_shape"
              name="diamond_shape"
              disabled={locked}
              defaultValue={order?.diamond_shape ?? ""}
              className={selectClassName}
            >
              <option value="">Sin especificar</option>
              {DIAMOND_SHAPE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="gemstone_type">Tipo de gemstone</Label>
            <select
              id="gemstone_type"
              name="gemstone_type"
              disabled={locked}
              defaultValue={order?.gemstone_type ?? ""}
              className={selectClassName}
            >
              <option value="">Sin especificar</option>
              {GEMSTONE_TYPE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="size">Tamaño / talla</Label>
            <Input
              id="size"
              name="size"
              disabled={locked}
              defaultValue={order?.size ?? ""}
              placeholder="Ej. 7, 16 cm…"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Foto del producto</Label>
          <CustomerOrderPhotoField
            defaultUrl={order?.photo_url}
            disabled={locked}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="customer_name">Nombre de la clienta</Label>
          <Input
            id="customer_name"
            name="customer_name"
            required
            defaultValue={order?.customer_name ?? ""}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="ordered_at">Fecha del pedido</Label>
            <Input
              id="ordered_at"
              name="ordered_at"
              type="date"
              required
              defaultValue={orderedAtDefault}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="due_date">Fecha límite (opcional)</Label>
            <Input
              id="due_date"
              name="due_date"
              type="date"
              defaultValue={order?.due_date?.slice(0, 10) ?? ""}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="lightspeed_sku">SKU Lightspeed</Label>
            <Input
              id="lightspeed_sku"
              name="lightspeed_sku"
              disabled={locked}
              defaultValue={order?.lightspeed_sku ?? ""}
              placeholder="Uso interno"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="provider_sku">SKU Proveedor</Label>
            <Input
              id="provider_sku"
              name="provider_sku"
              disabled={locked}
              defaultValue={order?.provider_sku ?? ""}
              placeholder="Código de la fábrica"
            />
          </div>
        </div>

        <FactorySelectField
          factories={factories}
          defaultFactoryId={order?.factory_id}
          disabled={locked}
        />

        <div className="flex flex-wrap gap-6">
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="is_urgent"
              defaultChecked={order?.is_urgent ?? false}
              className="size-4 rounded border"
            />
            Urgente
          </label>
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="is_restock"
              defaultChecked={order?.is_restock ?? false}
              className="size-4 rounded border"
            />
            Reposición
          </label>
        </div>

        {order && (
          <div className="space-y-4 rounded-lg border p-4">
            <p className="text-sm font-medium">Estado y fechas de avance</p>
            <div className="space-y-2">
              <Label htmlFor="status">Estado</Label>
              <select
                id="status"
                name="status"
                defaultValue={order.status}
                className={selectClassName}
              >
                {CUSTOMER_ORDER_EDITABLE_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {CUSTOMER_ORDER_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="arrived_panama_at">Llegó a Panamá</Label>
                <Input
                  id="arrived_panama_at"
                  name="arrived_panama_at"
                  type="date"
                  defaultValue={order.arrived_panama_at?.slice(0, 10) ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="delivered_at">Entregado a clienta</Label>
                <Input
                  id="delivered_at"
                  name="delivered_at"
                  type="date"
                  defaultValue={order.delivered_at?.slice(0, 10) ?? ""}
                />
              </div>
            </div>
          </div>
        )}

        <Button type="submit" className="w-full sm:w-auto">
          {submitLabel}
        </Button>
      </form>

      {order ? (
        <div className="pt-1">
          <CancelCustomerOrderButton orderId={order.id} />
        </div>
      ) : null}
    </div>
  );
}
