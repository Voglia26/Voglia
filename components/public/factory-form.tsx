"use client";

import { useRef, useState, useTransition } from "react";
import type { Item, ItemVariant, Quote } from "@/lib/types";
import {
  QUOTE_COLUMNS,
  KARATAGE_OPTIONS,
  type QuoteColumnKey,
  quoteTotal,
} from "@/lib/types";
import { ItemPhotos } from "@/components/items/item-photos";
import { ItemDetails } from "@/components/public/item-details";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { submitFactoryQuotation, type QuoteInput } from "@/app/q/[token]/actions";
import { Loader2, Ban } from "lucide-react";
import { cn } from "@/lib/utils";

export type FactoryFormRow = {
  assignmentId: string;
  item: Item;
  variants: ItemVariant[];
  quotesByVariantId: Record<string, Quote | null>;
};

type Values = Partial<Record<QuoteColumnKey, string>>;
type FieldKey = string;

function fieldKey(assignmentId: string, variantId: string): FieldKey {
  return `${assignmentId}:${variantId}`;
}

function costFieldName(
  assignmentId: string,
  variantId: string,
  col: QuoteColumnKey
): string {
  return `${assignmentId}__${variantId}__${col}`;
}

function initialFormState(rows: FactoryFormRow[]) {
  const values: Record<FieldKey, Values> = {};
  const notes: Record<FieldKey, string> = {};
  const karatage: Record<FieldKey, string> = {};
  const productDescriptions: Record<FieldKey, string> = {};
  const declined: Record<FieldKey, boolean> = {};

  for (const row of rows) {
    for (const variant of row.variants) {
      const key = fieldKey(row.assignmentId, variant.id);
      const q = row.quotesByVariantId[variant.id];
      if (!q) continue;

      const v: Values = {};
      for (const col of QUOTE_COLUMNS) {
        const n = q[col.key];
        if (n !== null && n !== undefined) v[col.key] = String(n);
      }
      if (Object.keys(v).length > 0) values[key] = v;
      if (q.notes) notes[key] = q.notes;
      if (q.karatage) karatage[key] = q.karatage;
      if (q.product_description) {
        productDescriptions[key] = q.product_description;
      }
      if (q.declined) declined[key] = true;
    }
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

function readCostValuesFromForm(form: HTMLFormElement): Record<FieldKey, Values> {
  const fd = new FormData(form);
  const out: Record<FieldKey, Values> = {};

  for (const [key, raw] of fd.entries()) {
    if (typeof raw !== "string") continue;
    const match = key.match(
      /^([0-9a-f-]{36})__([0-9a-f-]{36})__(gold_loss|total_gold_cost|diamond_cost|cost_per_carat|labor|other_fees)$/
    );
    if (!match) continue;
    const [, assignmentId, variantId, colKey] = match;
    if (!raw.trim()) continue;
    const fk = fieldKey(assignmentId, variantId);
    if (!out[fk]) out[fk] = {};
    out[fk][colKey as QuoteColumnKey] = raw;
  }

  return out;
}

export function FactoryForm({
  token,
  rows,
  alreadySubmitted = false,
}: {
  token: string;
  rows: FactoryFormRow[];
  alreadySubmitted?: boolean;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const initialRef = useRef(initialFormState(rows));

  const [draftValues, setDraftValues] = useState<Record<FieldKey, Values>>(
    () => initialRef.current.values
  );
  const [notes, setNotes] = useState<Record<FieldKey, string>>(
    () => initialRef.current.notes
  );
  const [karatage, setKaratage] = useState<Record<FieldKey, string>>(
    () => initialRef.current.karatage
  );
  const [productDescriptions, setProductDescriptions] = useState<
    Record<FieldKey, string>
  >(() => initialRef.current.productDescriptions);
  const [declined, setDeclined] = useState<Record<FieldKey, boolean>>(
    () => initialRef.current.declined
  );
  const [submitting, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState(alreadySubmitted);

  function handleCostInput(fk: FieldKey, col: QuoteColumnKey, v: string) {
    if (v && declined[fk]) {
      setDeclined((prev) => ({ ...prev, [fk]: false }));
    }
    setDraftValues((prev) => ({
      ...prev,
      [fk]: { ...(prev[fk] ?? {}), [col]: v },
    }));
  }

  function handleSubmit() {
    setErr(null);
    const formValues = formRef.current
      ? readCostValuesFromForm(formRef.current)
      : draftValues;

    const inputs: QuoteInput[] = [];
    for (const row of rows) {
      for (const variant of row.variants) {
        const fk = fieldKey(row.assignmentId, variant.id);
        const parsed = parseValues(formValues[fk]);
        inputs.push({
          assignmentId: row.assignmentId,
          variantId: variant.id,
          values: parsed,
          declined: !!declined[fk],
          notes: notes[fk] ?? null,
          karatage: karatage[fk] ?? null,
          product_description: productDescriptions[fk] ?? null,
        });
      }
    }

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
      ref={formRef}
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
            All variants were submitted together. You can keep editing and
            resubmit when ready.
          </p>
        </div>
      )}
      <div className="space-y-4">
        {rows.map((row, idx) => (
          <div
            key={row.assignmentId}
            className="factory-form-item space-y-4 rounded-xl border border-border bg-card p-5 sm:p-6"
          >
            <Card className="overflow-visible p-0 border-0 shadow-none ring-0 bg-transparent">
              <div className="flex flex-col sm:flex-row gap-4 sm:gap-5">
                <div className="shrink-0 self-center sm:self-start">
                  <ItemPhotos
                    urls={row.item.photo_urls ?? []}
                    size="lg"
                    zoomable
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="eyebrow mb-2">Item {idx + 1}</p>
                  <ItemDetails item={row.item} />
                </div>
              </div>
            </Card>

            <div className="space-y-6 border-t border-border pt-5">
              {row.variants.map((variant) => {
                const fk = fieldKey(row.assignmentId, variant.id);
                const isDeclined = !!declined[fk];
                const displayValues = draftValues[fk];

                return (
                  <div
                    key={variant.id}
                    className={cn(
                      "space-y-4 rounded-lg border border-border bg-muted/20 p-4 sm:p-5",
                      isDeclined && "opacity-60"
                    )}
                  >
                    <div>
                      <p className="font-heading text-lg leading-tight">
                        {variant.label}
                      </p>
                      {variant.description ? (
                        <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                          {variant.description}
                        </p>
                      ) : null}
                    </div>

                    <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                      <Checkbox
                        checked={isDeclined}
                        onCheckedChange={(v) =>
                          setDeclined((prev) => ({
                            ...prev,
                            [fk]: !!v,
                          }))
                        }
                      />
                      <span className="text-sm inline-flex items-center gap-1.5">
                        <Ban className="h-3.5 w-3.5" />
                        Cannot quote this variant
                      </span>
                    </label>

                    <div className="space-y-2">
                      <label
                        htmlFor={`${fk}-karatage`}
                        className="block text-sm font-medium"
                      >
                        Karatage
                      </label>
                      <select
                        id={`${fk}-karatage`}
                        value={karatage[fk] ?? ""}
                        onChange={(e) =>
                          setKaratage((prev) => ({
                            ...prev,
                            [fk]: e.target.value,
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
                    </div>

                    <div className="space-y-2">
                      <label
                        htmlFor={`${fk}-product_description`}
                        className="block text-sm font-medium"
                      >
                        Product description
                      </label>
                      <textarea
                        id={`${fk}-product_description`}
                        rows={3}
                        value={productDescriptions[fk] ?? ""}
                        onChange={(e) =>
                          setProductDescriptions((prev) => ({
                            ...prev,
                            [fk]: e.target.value,
                          }))
                        }
                        placeholder="Describe the product you are quoting for this variant..."
                        className="block w-full min-h-24 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
                      />
                    </div>

                    <div>
                      <p className="text-sm font-semibold text-foreground mb-3">
                        Cost breakdown
                      </p>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                        {QUOTE_COLUMNS.map((col) => (
                          <div key={col.key} className="space-y-1.5">
                            <label
                              htmlFor={`${fk}-${col.key}`}
                              className="text-xs font-medium text-muted-foreground"
                            >
                              {col.label}
                            </label>
                            <input
                              id={`${fk}-${col.key}`}
                              name={costFieldName(
                                row.assignmentId,
                                variant.id,
                                col.key
                              )}
                              type="text"
                              inputMode="decimal"
                              autoComplete="off"
                              defaultValue={
                                initialRef.current.values[fk]?.[col.key] ?? ""
                              }
                              onInput={(e) =>
                                handleCostInput(
                                  fk,
                                  col.key,
                                  e.currentTarget.value
                                )
                              }
                              className="block h-11 w-full cursor-text rounded-lg border border-input bg-background px-3 text-base tabular-nums text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-2 border-t">
                      <p className="text-sm font-medium mb-1.5">Total</p>
                      <p className="h-12 flex items-center text-lg tabular-nums font-heading">
                        {computeDisplayTotal(displayValues).toLocaleString(
                          undefined,
                          {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          }
                        )}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <label
                        htmlFor={`${fk}-notes`}
                        className="text-sm font-medium"
                      >
                        Notes (optional)
                      </label>
                      <textarea
                        id={`${fk}-notes`}
                        rows={2}
                        value={notes[fk] ?? ""}
                        onChange={(e) =>
                          setNotes((prev) => ({
                            ...prev,
                            [fk]: e.target.value,
                          }))
                        }
                        placeholder="Lead time, comments, etc."
                        className="block w-full min-h-16 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {err && (
        <p
          className="text-sm text-destructive border border-destructive/30 bg-destructive/5 rounded-md p-3"
          role="alert"
        >
          {err}
        </p>
      )}

      <div className="flex flex-col items-stretch justify-between gap-3 border-t pt-4 sm:flex-row sm:items-center">
        <p className="text-xs text-muted-foreground max-w-md">
          Quote every variant, then submit once at the bottom. All variants are
          saved together.
        </p>
        <Button
          type="submit"
          size="lg"
          disabled={submitting}
          className="h-12 shrink-0 eyebrow text-xs tracking-[0.2em]"
        >
          {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {saved ? "Resubmit quotation" : "Submit quotation"}
        </Button>
      </div>
    </form>
  );
}
