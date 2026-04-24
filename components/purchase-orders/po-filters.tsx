"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import {
  PURCHASE_ORDER_STATUS_FLOW,
  PURCHASE_ORDER_STATUS_LABELS,
} from "@/lib/types";

export function POFilters({
  factories,
  current,
}: {
  factories: { id: string; name: string }[];
  current: {
    status?: string;
    factory_id?: string;
    from?: string;
    to?: string;
  };
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  function update(key: string, value: string | null) {
    const next = new URLSearchParams(params.toString());
    if (!value) next.delete(key);
    else next.set(key, value);
    startTransition(() => {
      router.push(`/admin/purchase-orders?${next.toString()}`);
    });
  }

  const hasAny =
    !!current.status || !!current.factory_id || !!current.from || !!current.to;

  return (
    <div className="flex flex-col lg:flex-row gap-3 lg:items-end mb-6 p-4 rounded-lg border bg-card">
      <Field label="Status">
        <Select
          value={current.status ?? ""}
          onValueChange={(v) => update("status", v || null)}
        >
          <SelectTrigger className="h-10 w-full lg:w-[160px]">
            <SelectValue placeholder="All statuses">
              {(v: unknown) =>
                (typeof v === "string" &&
                  v &&
                  PURCHASE_ORDER_STATUS_LABELS[
                    v as keyof typeof PURCHASE_ORDER_STATUS_LABELS
                  ]) ||
                "All statuses"
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {PURCHASE_ORDER_STATUS_FLOW.map((s) => (
              <SelectItem key={s} value={s}>
                {PURCHASE_ORDER_STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field label="Factory">
        <Select
          value={current.factory_id ?? ""}
          onValueChange={(v) => update("factory_id", v || null)}
        >
          <SelectTrigger className="h-10 w-full lg:w-[200px]">
            <SelectValue placeholder="All factories">
              {(v: unknown) =>
                (typeof v === "string" &&
                  v &&
                  factories.find((f) => f.id === v)?.name) ||
                "All factories"
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {factories.map((f) => (
              <SelectItem key={f.id} value={f.id}>
                {f.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field label="From">
        <Input
          type="date"
          value={current.from ?? ""}
          onChange={(e) => update("from", e.target.value || null)}
          className="h-10 w-full lg:w-[150px]"
        />
      </Field>

      <Field label="To">
        <Input
          type="date"
          value={current.to ?? ""}
          onChange={(e) => update("to", e.target.value || null)}
          className="h-10 w-full lg:w-[150px]"
        />
      </Field>

      {hasAny && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            startTransition(() => router.push("/admin/purchase-orders"));
          }}
          disabled={pending}
          className="shrink-0"
        >
          <X className="h-4 w-4 mr-1" />
          Clear
        </Button>
      )}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="eyebrow text-[10px]">{label}</Label>
      {children}
    </div>
  );
}
