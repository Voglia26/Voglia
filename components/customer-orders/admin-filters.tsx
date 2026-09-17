"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import {
  CUSTOMER_ORDER_STATUS_FLOW,
  CUSTOMER_ORDER_STATUS_LABELS,
} from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export function CustomerOrderFilters({
  sellers,
  factories,
  customStatuses = [],
}: {
  sellers: { id: string; display_name: string }[];
  factories: { id: string; name: string }[];
  customStatuses?: { id: string; label: string }[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  function update(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    startTransition(() => {
      router.push(`/admin/customer-orders?${params.toString()}`);
    });
  }

  const selectClass =
    "h-9 rounded-md border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40";

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Vendedora</Label>
        <select
          className={selectClass}
          value={searchParams.get("seller_id") ?? ""}
          onChange={(e) => update("seller_id", e.target.value)}
        >
          <option value="">Todas</option>
          {sellers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.display_name}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Proveedor</Label>
        <select
          className={selectClass}
          value={searchParams.get("factory_id") ?? ""}
          onChange={(e) => update("factory_id", e.target.value)}
        >
          <option value="">Todos</option>
          {factories.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Estado</Label>
        <select
          className={selectClass}
          value={searchParams.get("status") ?? ""}
          onChange={(e) => update("status", e.target.value)}
        >
          <option value="">Todos</option>
          {CUSTOMER_ORDER_STATUS_FLOW.map((s) => (
            <option key={s} value={s}>
              {CUSTOMER_ORDER_STATUS_LABELS[s]}
            </option>
          ))}
          {customStatuses.map((s) => (
            <option key={s.id} value={`custom:${s.id}`}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Urgente</Label>
        <select
          className={selectClass}
          value={searchParams.get("urgent") ?? ""}
          onChange={(e) => update("urgent", e.target.value)}
        >
          <option value="">Todos</option>
          <option value="1">Sí</option>
          <option value="0">No</option>
        </select>
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Reposición</Label>
        <select
          className={selectClass}
          value={searchParams.get("restock") ?? ""}
          onChange={(e) => update("restock", e.target.value)}
        >
          <option value="">Todos</option>
          <option value="1">Solo reposición</option>
          <option value="0">Sin reposición</option>
        </select>
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Cancelados</Label>
        <select
          className={selectClass}
          value={searchParams.get("cancelled") ?? ""}
          onChange={(e) => update("cancelled", e.target.value)}
        >
          <option value="">Incluir</option>
          <option value="hide">Ocultar cancelados</option>
          <option value="only">Solo cancelados</option>
        </select>
      </div>
      {(searchParams.get("seller_id") ||
        searchParams.get("factory_id") ||
        searchParams.get("status") ||
        searchParams.get("urgent") ||
        searchParams.get("restock") ||
        searchParams.get("cancelled")) && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() =>
            startTransition(() => router.push("/admin/customer-orders"))
          }
        >
          Limpiar
        </Button>
      )}
    </div>
  );
}
