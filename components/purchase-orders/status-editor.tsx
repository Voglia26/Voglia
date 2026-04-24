"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import {
  PURCHASE_ORDER_STATUS_FLOW,
  PURCHASE_ORDER_STATUS_LABELS,
  type PurchaseOrderStatus,
} from "@/lib/types";
import { setPurchaseOrderStatus } from "@/app/admin/(dash)/purchase-orders/[id]/actions";

export function POStatusEditor({
  poId,
  current,
}: {
  poId: string;
  current: PurchaseOrderStatus;
}) {
  const [value, setValue] = useState<PurchaseOrderStatus>(current);
  const [pending, startTransition] = useTransition();

  function save() {
    const fd = new FormData();
    fd.append("id", poId);
    fd.append("status", value);
    startTransition(async () => {
      await setPurchaseOrderStatus(fd);
    });
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-end gap-2">
      <div className="space-y-1.5 flex-1">
        <Label className="eyebrow text-[10px]">Update status</Label>
        <Select
          value={value}
          onValueChange={(v) => setValue(v as PurchaseOrderStatus)}
        >
          <SelectTrigger className="h-10 w-full sm:w-[180px]">
            <SelectValue>
              {(v: unknown) =>
                typeof v === "string" && v
                  ? PURCHASE_ORDER_STATUS_LABELS[
                      v as keyof typeof PURCHASE_ORDER_STATUS_LABELS
                    ]
                  : "Select"
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
      </div>
      <Button
        onClick={save}
        disabled={pending || value === current}
        className="shrink-0"
      >
        {pending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        Save
      </Button>
    </div>
  );
}
