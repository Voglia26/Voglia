"use client";

import { useState, useTransition } from "react";
import type { Item, Quote } from "@/lib/types";
import { QUOTE_COLUMNS, KARATAGE_OPTIONS, type QuoteColumnKey, quoteTotal } from "@/lib/types";
import { ItemPhotos } from "@/components/items/item-photos";
import { ItemDetails } from "@/components/public/item-details";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { submitFactoryQuotation, type QuoteInput } from "@/app/q/[token]/actions";
import { Loader2, Ban } from "lucide-react";
import { cn } from "@/lib/utils";

type Row = { assignmentId: string; item: Item; quote?: Quote | null };
type Values = Partial<Record<QuoteColumnKey, string>>;

function initialFormState(items: Row[]) {
  const values: Record<string, Values> = {};
  const notes: Record<string, string> = {};
  const karatage: Record<string, string> = {};
  const productDescriptions: Record<string, string> = {};
  const declined: Record<string, boolean> = {};

  for (const row of items) {
    const q = row.quote;
    if (!q) continue;

    const v: Values = {};
    for (const col of QUOTE_COLUMNS) {
      const n = q[col.key];
      if (n !== null && n !== undefined) v[col.key] = String(n);
    }
    if (Object.keys(v).length > 0) values[row.assignmentId] = v;
    if (q.notes) notes[row.assignmentId] = q.notes;
    if (q.karatage) karatage[row.assignmentId] = q.karatage;
    if (q.product_description) {
      productDescriptions[row.assignmentId] = q.product_description;
    }
    if (q.declined) declined[row.assignmentId] = true;
  }

  return { values, notes, karatage, productDescriptions, declined };
}

function parseValues(raw: Values | undefined) {
  const parsed: Partial<Record<QuoteColumnKey, number | null>> = {};
  for (const col of QUOTE_COLUMNS) {
    const v = raw?.[col.key];
    const n = v && v.trim() ? Number(v) : null;
    parsed[col.key] = n !== null && Number.isFinite(n) ? n : null;
  }
  return parsed;
}

function computeDisplayTotal(raw: Values | undefined): number {
  return quoteTotal({ ...parseValues(raw), declined: false, final_price: null });
}

export function FactoryForm({
  token,
  items,
  alreadySubmitted = false,
}: {
  token: string;
  items: Row[];
  alreadySubmitted?: boolean;
}) {
  const initial = initialFormState(items);
  const [values, setValues] = useState<Record<string, Values>>(initial.values);
  const [notes, setNotes] = useState<Record<string, string>>(initial.notes);
  const [karatage, setKaratage] = useState<Record<string, string>>(
    initial.karatage
  );
  const [productDescriptions, setProductDescriptions] = useState<
    Record<string, string>
  >(initial.productDescriptions);
  const [declined, setDeclined] = useState<Record<string, boolean>>(
    initial.declined
  );
  const [submitting, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState(alreadySubmitted);

  function setValue(assignmentId: string, col: QuoteColumnKey, v: string) {
    setValues((prev) => ({
      ...prev,
      [assignmentId]: { ...(prev[assignmentId] ?? {}), [col]: v },
    }));
  }

  function handleSubmit() {
    setErr(null);
    const inputs: QuoteInput[] = items.map((r) => {
      const parsed = parseValues(values[r.assignmentId]);
      return {
        assignmentId: r.assignmentId,
        values: parsed,
        declined: !!declined[r.assignmentId],
        notes: notes[r.assignmentId] ?? null,
        karatage: karatage[r.assignmentId] ?? null,
        product_description: productDescriptions[r.assignmentId] ?? null,
      };
    });

    startTransition(async () => {
      const res = await submitFactoryQuotation(token, inputs);
      if (res.ok) {
        setSaved(true);
        setErr(null);
      } else setErr(res.error);
    });
  }

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit();
      }}
    >
      {saved && (
        <div className="rounded-lg border border-green-600/30 bg-green-600/5 p-4 text-sm">
          <p className="font-medium">Quotation saved</p>
          <p className="text-muted-foreground mt-0.5">
            All items were submitted together. You can keep editing and resubmit
            when ready.
          </p>
        </div>
      )}
      <div className="space-y-4 pb-28">
        {items.map((row, idx) => {
          const isDeclined = !!declined[row.assignmentId];
          return (
            <div
              key={row.assignmentId}
              className="factory-form-item space-y-4 rounded-xl border border-border bg-card p-5 sm:p-6"
            >
              <Card
                className={cn(
                  "p-0 border-0 shadow-none ring-0 bg-transparent",
                  isDeclined && "opacity-60"
                )}
              >
                <div className="flex flex-col sm:flex-row gap-4 sm:gap-5">
                  <div className="shrink-0 self-center sm:self-start">
                    <ItemPhotos
                      urls={row.item.photo_urls ?? []}
                      size="lg"
                      faded={isDeclined}
                      zoomable
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="eyebrow mb-2">Item {idx + 1}</p>
                    <ItemDetails item={row.item} faded={isDeclined} />

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
              </Card>

              <label
                htmlFor={`${row.assignmentId}-karatage`}
                className="block text-sm font-medium"
              >
                Karatage
              </label>
              <select
                id={`${row.assignmentId}-karatage`}
                value={karatage[row.assignmentId] ?? ""}
                onChange={(e) =>
                  setKaratage((prev) => ({
                    ...prev,
                    [row.assignmentId]: e.target.value,
                  }))
                }
                className="block w-full h-11 rounded-lg border border-input bg-background px-3 text-sm text-foreground"
              >
                <option value="">Select karatage</option>
                {KARATAGE_OPTIONS.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>

              <label
                htmlFor={`${row.assignmentId}-product_description`}
                className="block text-sm font-medium"
              >
                Product description
              </label>
              <textarea
                id={`${row.assignmentId}-product_description`}
                rows={3}
                value={productDescriptions[row.assignmentId] ?? ""}
                onChange={(e) =>
                  setProductDescriptions((prev) => ({
                    ...prev,
                    [row.assignmentId]: e.target.value,
                  }))
                }
                placeholder="Describe the product you are quoting..."
                className="block w-full min-h-24 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
              />

              <div className="space-y-5 border-t border-border pt-5">
                <div>
                  <p className="text-sm font-semibold text-foreground mb-3">
                    Cost breakdown
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                    {QUOTE_COLUMNS.map((col) => (
                      <div key={col.key} className="space-y-1.5">
                        <label
                          htmlFor={`${row.assignmentId}-${col.key}`}
                          className="text-xs font-medium text-muted-foreground"
                        >
                          {col.label}
                        </label>
                        <input
                          id={`${row.assignmentId}-${col.key}`}
                          name={`${row.assignmentId}-${col.key}`}
                          type="text"
                          inputMode="decimal"
                          autoComplete="off"
                          disabled={isDeclined}
                          value={values[row.assignmentId]?.[col.key] ?? ""}
                          onChange={(e) =>
                            setValue(row.assignmentId, col.key, e.target.value)
                          }
                          className={cn(
                            "block h-11 w-full rounded-lg border border-input bg-background px-3 text-base tabular-nums text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
                            isDeclined && "opacity-50 cursor-not-allowed"
                          )}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-2 border-t">
                  <p className="text-sm font-medium mb-1.5">Total</p>
                  <p className="h-12 flex items-center text-lg tabular-nums font-heading">
                    {computeDisplayTotal(values[row.assignmentId]).toLocaleString(
                      undefined,
                      { minimumFractionDigits: 2, maximumFractionDigits: 2 }
                    )}
                  </p>
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor={`${row.assignmentId}-notes`}
                    className="text-sm font-medium"
                  >
                    Notes (optional)
                  </label>
                  <textarea
                    id={`${row.assignmentId}-notes`}
                    rows={2}
                    disabled={isDeclined}
                    value={notes[row.assignmentId] ?? ""}
                    onChange={(e) =>
                      setNotes((prev) => ({
                        ...prev,
                        [row.assignmentId]: e.target.value,
                      }))
                    }
                    placeholder="Lead time, comments, etc."
                    className={cn(
                      "block w-full min-h-16 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
                      isDeclined && "opacity-50 cursor-not-allowed"
                    )}
                  />
                </div>
              </div>
            </div>
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
          Fill in all items, then submit once at the bottom. All items are saved
          together.
        </p>
        <Button
          type="submit"
          size="lg"
          disabled={submitting}
          className="h-12 eyebrow text-xs tracking-[0.2em] shrink-0"
        >
          {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {saved ? "Resubmit quotation" : "Submit quotation"}
        </Button>
      </div>
    </form>
  );
}
