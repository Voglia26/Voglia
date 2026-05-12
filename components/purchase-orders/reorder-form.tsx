"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { ImageIcon, Loader2 } from "lucide-react";
import { createReorder } from "@/app/admin/(dash)/purchase-orders/[id]/reorder/actions";

type ItemRow = {
  item_id: string;
  quote_id: string | null;
  name: string;
  photo_url: string | null;
  quantity: number;
  size: string;
  gold_color: string;
  gemstone: string;
  other_comments: string;
};

export function ReorderForm({
  originalPoId,
  items,
}: {
  originalPoId: string;
  items: ItemRow[];
}) {
  const [rows, setRows] = useState<ItemRow[]>(items);
  const [err, setErr] = useState<string | null>(null);
  const [submitting, startTransition] = useTransition();

  function update(idx: number, field: keyof ItemRow, value: string | number) {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r)));
  }

  function handleSubmit() {
    setErr(null);
    startTransition(async () => {
      const res = await createReorder(
        originalPoId,
        rows.map((r) => ({
          item_id: r.item_id,
          quote_id: r.quote_id,
          quantity: Number(r.quantity) || 1,
          size: r.size || null,
          gold_color: r.gold_color || null,
          gemstone: r.gemstone || null,
          other_comments: r.other_comments || null,
        }))
      );
      if (res && !res.ok) setErr(res.error);
    });
  }

  return (
    <div className="space-y-4">
      {rows.map((row, idx) => (
        <Card key={row.item_id} className="p-5">
          <div className="flex gap-4">
            {row.photo_url ? (
              <Image
                src={row.photo_url}
                alt=""
                width={80}
                height={80}
                className="h-20 w-20 object-cover rounded shrink-0"
                unoptimized
              />
            ) : (
              <div className="h-20 w-20 bg-muted rounded flex items-center justify-center shrink-0">
                <ImageIcon className="h-5 w-5 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h3 className="font-heading text-xl mb-3">{row.name}</h3>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div>
                  <Label className="eyebrow text-[10px] mb-1 block">Qty</Label>
                  <Input
                    type="number"
                    min="1"
                    className="h-9 text-right tabular-nums"
                    value={row.quantity}
                    onChange={(e) => update(idx, "quantity", Math.max(1, Number(e.target.value) || 1))}
                  />
                </div>
                <div>
                  <Label className="eyebrow text-[10px] mb-1 block">Size</Label>
                  <Input
                    className="h-9"
                    placeholder="e.g. 7"
                    value={row.size}
                    onChange={(e) => update(idx, "size", e.target.value)}
                  />
                </div>
                <div>
                  <Label className="eyebrow text-[10px] mb-1 block">Gold Color</Label>
                  <Input
                    className="h-9"
                    placeholder="e.g. Yellow"
                    value={row.gold_color}
                    onChange={(e) => update(idx, "gold_color", e.target.value)}
                  />
                </div>
                <div>
                  <Label className="eyebrow text-[10px] mb-1 block">Gemstone</Label>
                  <Input
                    className="h-9"
                    placeholder="e.g. Diamond"
                    value={row.gemstone}
                    onChange={(e) => update(idx, "gemstone", e.target.value)}
                  />
                </div>
                <div>
                  <Label className="eyebrow text-[10px] mb-1 block">Other</Label>
                  <Input
                    className="h-9"
                    placeholder="Comments..."
                    value={row.other_comments}
                    onChange={(e) => update(idx, "other_comments", e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
        </Card>
      ))}

      {err && (
        <p className="text-sm text-destructive border border-destructive/30 bg-destructive/5 rounded-md p-3">
          {err}
        </p>
      )}

      <div className="flex justify-end pt-2 border-t">
        <Button size="lg" onClick={handleSubmit} disabled={submitting} className="h-12 eyebrow text-xs tracking-[0.2em]">
          {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Confirm reorder
        </Button>
      </div>
    </div>
  );
}
