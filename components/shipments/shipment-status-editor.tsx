"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import {
  SHIPMENT_STATUS_FLOW,
  SHIPMENT_STATUS_LABELS,
  type ShipmentStatus,
} from "@/lib/types";
import { setShipmentStatus } from "@/app/admin/(dash)/shipments/actions";

export function ShipmentStatusEditor({
  shipmentId,
  current,
}: {
  shipmentId: string;
  current: ShipmentStatus;
}) {
  const [value, setValue] = useState<ShipmentStatus>(current);
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function save() {
    setErr(null);
    const fd = new FormData();
    fd.append("id", shipmentId);
    fd.append("status", value);
    startTransition(async () => {
      const res = await setShipmentStatus(fd);
      if (!res.ok) setErr(res.error);
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-col sm:flex-row sm:items-end gap-2">
        <div className="space-y-1.5 flex-1">
          <Label className="eyebrow text-[10px]">Status</Label>
          <select
            value={value}
            onChange={(e) => setValue(e.target.value as ShipmentStatus)}
            className="block h-10 w-full sm:w-[200px] rounded-lg border border-input bg-background px-3 text-sm"
          >
            {SHIPMENT_STATUS_FLOW.map((s) => (
              <option key={s} value={s}>
                {SHIPMENT_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
        <Button
          type="button"
          onClick={save}
          disabled={pending || value === current}
          className="shrink-0"
        >
          {pending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Save status
        </Button>
      </div>
      {err && <p className="text-sm text-destructive">{err}</p>}
      {value === "received" && value !== current && (
        <p className="text-xs text-muted-foreground">
          Marking as Received will move this shipment to history.
        </p>
      )}
    </div>
  );
}
