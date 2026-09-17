"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  createCustomOrderStatus,
  setCustomOrderStatusActive,
  updateAdminCustomerOrder,
} from "@/app/admin/(dash)/customer-orders/actions";
import {
  CUSTOMER_ORDER_ADMIN_STATUSES,
  CUSTOMER_ORDER_STATUS_LABELS,
  type CustomerOrder,
  type CustomerOrderCustomStatus,
  type Factory,
} from "@/lib/types";
import { FactorySelectField } from "@/components/customer-orders/factory-select-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

const selectClassName =
  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40";

export function AdminOrderEditor({
  order,
  factories,
  customStatuses,
}: {
  order: CustomerOrder;
  factories: Pick<Factory, "id" | "name">[];
  customStatuses: CustomerOrderCustomStatus[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const defaultStatusValue = order.custom_status_id
    ? `custom:${order.custom_status_id}`
    : order.status;

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await updateAdminCustomerOrder(formData);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setMessage("Guardado.");
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="rounded-xl border p-4 space-y-4">
      <input type="hidden" name="id" value={order.id} />
      <p className="text-sm font-medium">Asignación admin</p>

      <FactorySelectField
        factories={factories}
        defaultFactoryId={order.factory_id ?? undefined}
      />

      <div className="space-y-2">
        <Label htmlFor="status_value">Estado</Label>
        <select
          id="status_value"
          name="status_value"
          required
          defaultValue={defaultStatusValue}
          className={selectClassName}
        >
          {CUSTOMER_ORDER_ADMIN_STATUSES.map((s) => (
            <option key={s} value={s}>
              {CUSTOMER_ORDER_STATUS_LABELS[s]}
            </option>
          ))}
          {customStatuses
            .filter((s) => s.active || s.id === order.custom_status_id)
            .map((s) => (
              <option key={s.id} value={`custom:${s.id}`}>
                {s.label}
                {!s.active ? " (inactivo)" : ""}
              </option>
            ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="lightspeed_sku">SKU Lightspeed</Label>
        <Input
          id="lightspeed_sku"
          name="lightspeed_sku"
          defaultValue={order.lightspeed_sku ?? ""}
          placeholder="Puede corregirlo o completarlo el admin"
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {message && <p className="text-sm text-emerald-700">{message}</p>}

      <Button type="submit" disabled={pending}>
        {pending && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
        Guardar asignación
      </Button>
    </form>
  );
}

export function CustomStatusesManager({
  statuses,
}: {
  statuses: CustomerOrderCustomStatus[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const formData = new FormData(form);
    startTransition(async () => {
      const res = await createCustomOrderStatus(formData);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      form.reset();
      router.refresh();
    });
  }

  function toggle(id: string, active: boolean) {
    startTransition(async () => {
      await setCustomOrderStatusActive(id, active);
      router.refresh();
    });
  }

  return (
    <div className="rounded-xl border p-4 space-y-4">
      <div>
        <p className="text-sm font-medium">Estados personalizados</p>
        <p className="text-xs text-muted-foreground mt-1">
          Se crean una vez y quedan disponibles para cualquier pedido.
        </p>
      </div>

      <form onSubmit={onCreate} className="flex flex-wrap gap-2 items-end">
        <div className="space-y-1 flex-1 min-w-[12rem]">
          <Label htmlFor="custom_status_label">Nuevo estado</Label>
          <Input
            id="custom_status_label"
            name="label"
            required
            placeholder="Ej. En taller de engaste"
          />
        </div>
        <Button type="submit" size="sm" disabled={pending}>
          Agregar
        </Button>
      </form>
      {error && <p className="text-sm text-destructive">{error}</p>}

      {statuses.length === 0 ? (
        <p className="text-sm text-muted-foreground">Todavía no hay estados personalizados.</p>
      ) : (
        <ul className="space-y-2">
          {statuses.map((s) => (
            <li
              key={s.id}
              className="flex items-center justify-between gap-2 text-sm border rounded-lg px-3 py-2"
            >
              <span className={!s.active ? "text-muted-foreground line-through" : ""}>
                {s.label}
              </span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={pending}
                onClick={() => toggle(s.id, !s.active)}
              >
                {s.active ? "Desactivar" : "Reactivar"}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
