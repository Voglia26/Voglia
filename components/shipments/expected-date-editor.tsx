"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { setShipmentExpectedDate } from "@/app/admin/(dash)/shipments/actions";

export function ExpectedDateEditor({
  shipmentId,
  current,
}: {
  shipmentId: string;
  current: string | null;
}) {
  const [value, setValue] = useState(current ?? "");
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function save() {
    setErr(null);
    const fd = new FormData();
    fd.append("id", shipmentId);
    fd.append("expected_arrival_date", value);
    startTransition(async () => {
      const res = await setShipmentExpectedDate(fd);
      if (!res.ok) setErr(res.error);
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-col sm:flex-row sm:items-end gap-2">
        <div className="space-y-1.5 flex-1">
          <Label htmlFor={`expected-${shipmentId}`} className="eyebrow text-[10px]">
            Expected arrival
          </Label>
          <Input
            id={`expected-${shipmentId}`}
            type="date"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="h-10 sm:max-w-[200px]"
          />
        </div>
        <Button
          type="button"
          onClick={save}
          disabled={pending || value === (current ?? "")}
          variant="outline"
          className="shrink-0"
        >
          {pending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Save date
        </Button>
      </div>
      {err && <p className="text-sm text-destructive">{err}</p>}
    </div>
  );
}
