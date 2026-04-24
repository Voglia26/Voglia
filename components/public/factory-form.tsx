"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import type { Item } from "@/lib/types";
import { QUOTE_COLUMNS, type QuoteColumnKey } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { submitFactoryQuotation, type QuoteInput } from "@/app/q/[token]/actions";
import { ImageIcon, Loader2, Ban } from "lucide-react";
import { cn } from "@/lib/utils";

type Row = { assignmentId: string; item: Item };
type Values = Partial<Record<QuoteColumnKey | "final_price", string>>;

export function FactoryForm({ token, items }: { token: string; items: Row[] }) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, Values>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [declined, setDeclined] = useState<Record<string, boolean>>({});
  const [submitting, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function setValue(
    assignmentId: string,
    col: QuoteColumnKey | "final_price",
    v: string
  ) {
    setValues((prev) => ({
      ...prev,
      [assignmentId]: { ...(prev[assignmentId] ?? {}), [col]: v },
    }));
  }

  function handleSubmit() {
    setErr(null);
    const inputs: QuoteInput[] = items.map((r) => {
      const parsed: Partial<Record<QuoteColumnKey, number | null>> = {};
      for (const col of QUOTE_COLUMNS) {
        const raw = values[r.assignmentId]?.[col.key];
        const n = raw && raw.trim() ? Number(raw) : null;
        parsed[col.key] = n !== null && Number.isFinite(n) ? n : null;
      }
      const fpRaw = values[r.assignmentId]?.final_price;
      const fp = fpRaw && fpRaw.trim() ? Number(fpRaw) : null;
      return {
        assignmentId: r.assignmentId,
        values: parsed,
        final_price: fp !== null && Number.isFinite(fp) ? fp : null,
        declined: !!declined[r.assignmentId],
        notes: notes[r.assignmentId] ?? null,
      };
    });

    startTransition(async () => {
      const res = await submitFactoryQuotation(token, inputs);
      if (res.ok) router.refresh();
      else setErr(res.error);
    });
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {items.map((row, idx) => {
          const isDeclined = !!declined[row.assignmentId];
          return (
            <Card
              key={row.assignmentId}
              className={cn(
                "p-5 sm:p-6 transition-colors",
                isDeclined
                  ? "bg-muted/40 border-dashed"
                  : "hover:border-foreground/20"
              )}
            >
              <div className="flex flex-col sm:flex-row gap-4 sm:gap-5 mb-5">
                <div className="shrink-0 self-center sm:self-start">
                  {row.item.photo_url ? (
                    <Image
                      src={row.item.photo_url}
                      alt=""
                      width={140}
                      height={140}
                      className={cn(
                        "h-32 w-32 sm:h-36 sm:w-36 object-cover rounded-md",
                        isDeclined && "opacity-40 grayscale"
                      )}
                      unoptimized
                    />
                  ) : (
                    <div className="h-32 w-32 sm:h-36 sm:w-36 bg-muted rounded-md flex items-center justify-center">
                      <ImageIcon className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="eyebrow mb-1">Item {idx + 1}</p>
                  <h3
                    className={cn(
                      "font-heading text-2xl sm:text-3xl",
                      isDeclined && "line-through opacity-60"
                    )}
                  >
                    {row.item.name || "(untitled)"}
                  </h3>
                  {row.item.description && (
                    <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">
                      {row.item.description}
                    </p>
                  )}
                  {row.item.specs && <Specs specs={row.item.specs} />}

                  <label className="mt-4 inline-flex items-center gap-2 cursor-pointer select-none">
                    <Checkbox
                      checked={isDeclined}
                      onCheckedChange={(v) =>
                        setDeclined((prev) => ({
                          ...prev,
                          [row.assignmentId]: !!v,
                        }))
                      }
                    />
                    <span className="text-sm inline-flex items-center gap-1.5">
                      <Ban className="h-3.5 w-3.5" />
                      Cannot quote this item
                    </span>
                  </label>
                </div>
              </div>

              <fieldset disabled={isDeclined} className="space-y-4">
                <div>
                  <Label
                    htmlFor={`${row.assignmentId}-final_price`}
                    className="eyebrow text-[10px] mb-1.5 block"
                  >
                    Final price (all-inclusive) — optional
                  </Label>
                  <Input
                    id={`${row.assignmentId}-final_price`}
                    type="number"
                    step="0.01"
                    inputMode="decimal"
                    className="h-12 text-lg tabular-nums font-heading"
                    placeholder="0.00"
                    value={values[row.assignmentId]?.final_price ?? ""}
                    onChange={(e) =>
                      setValue(row.assignmentId, "final_price", e.target.value)
                    }
                  />
                  <p className="text-xs text-muted-foreground mt-1.5">
                    Use this if you prefer to provide a single total. If left
                    blank, the sum of the line items below will be used.
                  </p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 pt-2 border-t">
                  {QUOTE_COLUMNS.map((col) => (
                    <div key={col.key} className="space-y-1.5">
                      <Label
                        htmlFor={`${row.assignmentId}-${col.key}`}
                        className="eyebrow text-[10px]"
                      >
                        {col.label}
                      </Label>
                      <Input
                        id={`${row.assignmentId}-${col.key}`}
                        type="number"
                        step="0.01"
                        inputMode="decimal"
                        className="h-11 text-base tabular-nums"
                        value={values[row.assignmentId]?.[col.key] ?? ""}
                        onChange={(e) =>
                          setValue(row.assignmentId, col.key, e.target.value)
                        }
                      />
                    </div>
                  ))}
                </div>

                <div className="space-y-1.5">
                  <Label
                    htmlFor={`${row.assignmentId}-notes`}
                    className="eyebrow text-[10px]"
                  >
                    Notes (optional)
                  </Label>
                  <Textarea
                    id={`${row.assignmentId}-notes`}
                    rows={2}
                    value={notes[row.assignmentId] ?? ""}
                    onChange={(e) =>
                      setNotes((prev) => ({
                        ...prev,
                        [row.assignmentId]: e.target.value,
                      }))
                    }
                    placeholder="Lead time, comments, etc."
                  />
                </div>
              </fieldset>
            </Card>
          );
        })}
      </div>

      {err && (
        <p
          className="text-sm text-destructive border border-destructive/30 bg-destructive/5 rounded-md p-3"
          role="alert"
        >
          {err}
        </p>
      )}

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sticky bottom-0 -mx-4 sm:mx-0 px-4 sm:px-0 bg-background/95 backdrop-blur-md border-t pt-4 pb-4 sm:pb-2">
        <p className="text-xs text-muted-foreground max-w-md">
          Mark items you cannot quote as &quot;Cannot quote&quot; or leave them
          blank. Submission is final.
        </p>
        <Button
          size="lg"
          onClick={handleSubmit}
          disabled={submitting}
          className="h-12 eyebrow text-xs tracking-[0.2em] shrink-0"
        >
          {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Submit quotation
        </Button>
      </div>
    </div>
  );
}

function Specs({ specs }: { specs: Item["specs"] }) {
  if (!specs) return null;
  const entries = [
    specs.gold_weight !== null && specs.gold_weight !== undefined
      ? `${specs.gold_weight}g`
      : null,
    specs.diamond_carat_weight !== null && specs.diamond_carat_weight !== undefined
      ? `Diamond: ${specs.diamond_carat_weight}ct`
      : null,
    specs.gemstone_carat_weight || null,
    specs.custom_carat_weight || null,
    specs.gold_type || null,
    specs.stone_type || null,
  ].filter(Boolean);
  if (entries.length === 0) return null;
  return (
    <p className="text-xs text-muted-foreground mt-2 tracking-wide">
      {entries.join(" · ")}
    </p>
  );
}
