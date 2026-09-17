"use client";

import { useState } from "react";
import type { Factory } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const NEW_FACTORY_OPTION = "__new__";

const selectClassName =
  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 disabled:opacity-50";

export function FactorySelectField({
  factories,
  defaultFactoryId,
  disabled,
}: {
  factories: Pick<Factory, "id" | "name">[];
  defaultFactoryId?: string;
  disabled?: boolean;
}) {
  const [choice, setChoice] = useState(defaultFactoryId ?? "");
  const isNew = choice === NEW_FACTORY_OPTION;

  return (
    <div className="space-y-2">
      <Label htmlFor="factory_id">Proveedor / fábrica</Label>
      <select
        id="factory_id"
        name="factory_id"
        required
        disabled={disabled}
        value={choice}
        onChange={(e) => setChoice(e.target.value)}
        className={selectClassName}
      >
        <option value="" disabled>
          Selecciona una fábrica…
        </option>
        {factories.map((f) => (
          <option key={f.id} value={f.id}>
            {f.name}
          </option>
        ))}
        {!disabled && (
          <option value={NEW_FACTORY_OPTION}>+ Agregar nuevo proveedor</option>
        )}
      </select>

      {isNew && !disabled && (
        <div className="space-y-2 pt-1">
          <Label htmlFor="factory_name_new">Nombre del nuevo proveedor</Label>
          <Input
            id="factory_name_new"
            name="factory_name_new"
            required
            autoFocus
            placeholder="Escribe el nombre exactamente como lo usa la fábrica"
          />
          <p className="text-xs text-muted-foreground">
            Se agregará a la lista de proveedores para todas las vendedoras.
          </p>
        </div>
      )}
    </div>
  );
}
