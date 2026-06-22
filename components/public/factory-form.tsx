"use client";

import { useRef, useState, useTransition } from "react";
import type { Item, ItemVariant, Quote, QuoteStoneLine } from "@/lib/types";
import {
  QUOTE_TOTAL_SUM_KEYS,
  KARATAGE_OPTIONS,
  normalizeStoneLines,
  resolveDiamondCost,
  quoteTotal,
} from "@/lib/types";
import { ItemPhotos } from "@/components/items/item-photos";
import { ItemDetails } from "@/components/public/item-details";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  submitFactoryQuotation,
  type VariantQuoteInput,
} from "@/app/q/[token]/actions";
import { Loader2, Ban, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type FactoryFormRow = {
  assignmentId: string;
  item: Item;
  variants: ItemVariant[];
  referenceVariants: Array<{ label: string; description: string | null }>;
  quotesByVariantId: Record<string, Quote | null>;
};

type LocalVariant = {
  id: string;
  label: string;
  description: string;
};

type LocalStoneLine = {
  id: string;
  label: string;
  cost_per_carat: string;
  total_carats: string;
};

type CostFieldKey = (typeof QUOTE_TOTAL_SUM_KEYS)[number] | "diamond_cost";

type Values = Partial<Record<CostFieldKey, string>>;
type FieldKey = string;

function fieldKey(assignmentId: string, variantId: string): FieldKey {
  return `${assignmentId}:${variantId}`;
}

function costFieldName(
  assignmentId: string,
  variantId: string,
  col: CostFieldKey
): string {
  return `${assignmentId}__${variantId}__${col}`;
}

const ALL_COST_FIELDS: CostFieldKey[] = [
  "gold_loss",
  "total_gold_cost",
  "diamond_cost",
  "labor",
  "other_fees",
];

const COST_LABELS: Record<CostFieldKey, string> = {
  gold_loss: "Gold loss",
  total_gold_cost: "Total gold cost",
  diamond_cost: "Diamond cost",
  labor: "Labor",
  other_fees: "Other fees",
};

function emptyStoneLine(): LocalStoneLine {
  return {
    id: crypto.randomUUID(),
    label: "",
    cost_per_carat: "",
    total_carats: "",
  };
}

function initialStoneLinesFromQuote(q: Quote | null | undefined): LocalStoneLine[] {
  if (!q) return [emptyStoneLine()];
  const fromDb = normalizeStoneLines(q.stone_lines);
  if (fromDb.length > 0) {
    return fromDb.map((line) => ({
      id: crypto.randomUUID(),
      label: line.label,
      cost_per_carat: String(line.cost_per_carat),
      total_carats: String(line.total_carats),
    }));
  }
  if (
    q.cost_per_carat !== null &&
    q.cost_per_carat !== undefined &&
    q.total_carats !== null &&
    q.total_carats !== undefined
  ) {
    return [
      {
        id: crypto.randomUUID(),
        label: "Stones",
        cost_per_carat: String(q.cost_per_carat),
        total_carats: String(q.total_carats),
      },
    ];
  }
  return [emptyStoneLine()];
}

function initialStoneLinesByAssignment(rows: FactoryFormRow[]) {
  const variantsByAssignment = initialVariantsByAssignment(rows);
  const out: Record<FieldKey, LocalStoneLine[]> = {};
  for (const row of rows) {
    const variants = variantsByAssignment[row.assignmentId] ?? [];
    for (const variant of variants) {
      const key = fieldKey(row.assignmentId, variant.id);
      out[key] = initialStoneLinesFromQuote(
        row.quotesByVariantId[variant.id] ?? null
      );
    }
  }
  return out;
}

function parseStoneLines(stones: LocalStoneLine[]): QuoteStoneLine[] {
  const out: QuoteStoneLine[] = [];
  for (const line of stones) {
    const label = line.label.trim();
    const per = line.cost_per_carat.trim();
    const carats = line.total_carats.trim();
    if (!label || !per || !carats) continue;
    const p = Number(per);
    const c = Number(carats);
    if (!Number.isFinite(p) || !Number.isFinite(c)) continue;
    out.push({ label, cost_per_carat: p, total_carats: c });
  }
  return out;
}

function initialVariantsByAssignment(rows: FactoryFormRow[]) {
  const out: Record<string, LocalVariant[]> = {};
  for (const row of rows) {
    if (row.variants.length > 0) {
      out[row.assignmentId] = row.variants.map((v) => ({
        id: v.id,
        label: v.label,
        description: v.description ?? "",
      }));
    } else if (row.referenceVariants.length > 0) {
      out[row.assignmentId] = row.referenceVariants.map((v) => ({
        id: crypto.randomUUID(),
        label: v.label,
        description: v.description ?? "",
      }));
    } else {
      out[row.assignmentId] = [];
    }
  }
  return out;
}

function rowUsesReferenceSeed(row: FactoryFormRow) {
  return row.variants.length === 0 && row.referenceVariants.length > 0;
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
      for (const key of ALL_COST_FIELDS) {
        const n = q[key as keyof typeof q];
        if (n !== null && n !== undefined) v[key] = String(n);
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

function parseCostValues(
  raw: Values | undefined,
  stones: LocalStoneLine[]
): Partial<Quote> {
  const num = (key: CostFieldKey) => {
    const v = raw?.[key];
    const n = v && v.trim() ? Number(v) : null;
    return n !== null && Number.isFinite(n) ? n : null;
  };
  const stone_lines = parseStoneLines(stones);
  const partial: Partial<Quote> = {
    gold_loss: num("gold_loss"),
    total_gold_cost: num("total_gold_cost"),
    diamond_cost: num("diamond_cost"),
    cost_per_carat: null,
    total_carats: null,
    stone_lines,
    labor: num("labor"),
    other_fees: num("other_fees"),
    declined: false,
    final_price: null,
  };
  return {
    ...partial,
    diamond_cost: resolveDiamondCost(partial),
  };
}

function computeDisplayTotal(
  raw: Values | undefined,
  stones: LocalStoneLine[]
): number {
  return quoteTotal(parseCostValues(raw, stones));
}

function formatDiamondTotal(
  raw: Values | undefined,
  stones: LocalStoneLine[]
): string {
  const total = resolveDiamondCost(parseCostValues(raw, stones));
  if (total <= 0) return "";
  return String(total);
}

function readCostValuesFromForm(form: HTMLFormElement): Record<FieldKey, Values> {
  const fd = new FormData(form);
  const out: Record<FieldKey, Values> = {};

  for (const [key, raw] of fd.entries()) {
    if (typeof raw !== "string") continue;
    const match = key.match(
      /^([0-9a-f-]{36})__([0-9a-f-]{36})__(gold_loss|total_gold_cost|diamond_cost|labor|other_fees)$/
    );
    if (!match) continue;
    const [, assignmentId, variantId, colKey] = match;
    if (!raw.trim()) continue;
    const fk = fieldKey(assignmentId, variantId);
    if (!out[fk]) out[fk] = {};
    out[fk][colKey as CostFieldKey] = raw;
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

  const [variantsByAssignment, setVariantsByAssignment] = useState<
    Record<string, LocalVariant[]>
  >(() => initialVariantsByAssignment(rows));
  const [stoneLinesByField, setStoneLinesByField] = useState<
    Record<FieldKey, LocalStoneLine[]>
  >(() => initialStoneLinesByAssignment(rows));
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

  function addVariant(assignmentId: string) {
    const newId = crypto.randomUUID();
    setVariantsByAssignment((prev) => {
      const list = prev[assignmentId] ?? [];
      const n = list.length + 1;
      return {
        ...prev,
        [assignmentId]: [
          ...list,
          {
            id: newId,
            label: `Option ${n}`,
            description: "",
          },
        ],
      };
    });
    setStoneLinesByField((prev) => ({
      ...prev,
      [fieldKey(assignmentId, newId)]: [emptyStoneLine()],
    }));
  }

  function removeVariant(assignmentId: string, variantId: string) {
    setVariantsByAssignment((prev) => ({
      ...prev,
      [assignmentId]: (prev[assignmentId] ?? []).filter((v) => v.id !== variantId),
    }));
    const fk = fieldKey(assignmentId, variantId);
    setDraftValues((prev) => {
      const next = { ...prev };
      delete next[fk];
      return next;
    });
    setNotes((prev) => {
      const next = { ...prev };
      delete next[fk];
      return next;
    });
    setKaratage((prev) => {
      const next = { ...prev };
      delete next[fk];
      return next;
    });
    setProductDescriptions((prev) => {
      const next = { ...prev };
      delete next[fk];
      return next;
    });
    setDeclined((prev) => {
      const next = { ...prev };
      delete next[fk];
      return next;
    });
    setStoneLinesByField((prev) => {
      const next = { ...prev };
      delete next[fk];
      return next;
    });
  }

  function addStoneLine(fk: FieldKey) {
    setStoneLinesByField((prev) => ({
      ...prev,
      [fk]: [...(prev[fk] ?? [emptyStoneLine()]), emptyStoneLine()],
    }));
  }

  function removeStoneLine(fk: FieldKey, stoneId: string) {
    setStoneLinesByField((prev) => {
      const list = prev[fk] ?? [emptyStoneLine()];
      const next = list.filter((s) => s.id !== stoneId);
      return {
        ...prev,
        [fk]: next.length > 0 ? next : [emptyStoneLine()],
      };
    });
  }

  function updateStoneLine(
    fk: FieldKey,
    stoneId: string,
    patch: Partial<Omit<LocalStoneLine, "id">>
  ) {
    if (patch.cost_per_carat !== undefined || patch.total_carats !== undefined) {
      if (declined[fk]) {
        setDeclined((prev) => ({ ...prev, [fk]: false }));
      }
    }
    setStoneLinesByField((prev) => ({
      ...prev,
      [fk]: (prev[fk] ?? [emptyStoneLine()]).map((s) =>
        s.id === stoneId ? { ...s, ...patch } : s
      ),
    }));
  }

  function updateVariantMeta(
    assignmentId: string,
    variantId: string,
    patch: Partial<Pick<LocalVariant, "label" | "description">>
  ) {
    setVariantsByAssignment((prev) => ({
      ...prev,
      [assignmentId]: (prev[assignmentId] ?? []).map((v) =>
        v.id === variantId ? { ...v, ...patch } : v
      ),
    }));
  }

  function handleCostInput(fk: FieldKey, col: CostFieldKey, v: string) {
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
      : {};

    const inputs: VariantQuoteInput[] = [];
    for (const row of rows) {
      const variants = variantsByAssignment[row.assignmentId] ?? [];
      for (const variant of variants) {
        const fk = fieldKey(row.assignmentId, variant.id);
        const merged: Values = {
          ...(draftValues[fk] ?? {}),
          ...(formValues[fk] ?? {}),
        };
        const parsed = parseCostValues(merged, stoneLinesByField[fk] ?? []);
        inputs.push({
          assignmentId: row.assignmentId,
          variantId: variant.id,
          label: variant.label,
          description: variant.description,
          values: {
            gold_loss: parsed.gold_loss ?? null,
            total_gold_cost: parsed.total_gold_cost ?? null,
            diamond_cost: parsed.diamond_cost ?? null,
            cost_per_carat: null,
            total_carats: null,
            stone_lines: parsed.stone_lines ?? [],
            labor: parsed.labor ?? null,
            other_fees: parsed.other_fees ?? null,
          },
          declined: !!declined[fk],
          notes: notes[fk] ?? null,
          karatage: karatage[fk] ?? null,
          product_description: productDescriptions[fk] ?? null,
        });
      }
    }

    if (inputs.length === 0) {
      setErr("Add at least one quote option before submitting.");
      return;
    }

    if (inputs.some((i) => !i.label.trim())) {
      setErr("Every quote option needs a name.");
      return;
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
            All options were submitted together. You can keep editing and
            resubmit when ready.
          </p>
        </div>
      )}
      <div className="space-y-4">
        {rows.map((row, idx) => {
          const variants = variantsByAssignment[row.assignmentId] ?? [];

          return (
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

              <div className="space-y-4 border-t border-border pt-5">
                {rowUsesReferenceSeed(row) && variants.length > 0 && (
                  <p className="text-xs text-muted-foreground rounded-md border border-dashed px-3 py-2">
                    Suggested options from the client — edit names, prices, or add
                    more variants below.
                  </p>
                )}
                {variants.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No quote options yet. Add one to start quoting this item.
                  </p>
                ) : (
                  variants.map((variant) => {
                    const fk = fieldKey(row.assignmentId, variant.id);
                    const isDeclined = !!declined[fk];
                    const displayValues = draftValues[fk];
                    const stones = stoneLinesByField[fk] ?? [emptyStoneLine()];
                    const diamondTotal = formatDiamondTotal(displayValues, stones);

                    return (
                      <div
                        key={variant.id}
                        className={cn(
                          "space-y-4 rounded-lg border border-border bg-muted/20 p-4 sm:p-5",
                          isDeclined && "opacity-60"
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 space-y-3 min-w-0">
                            <div className="space-y-1.5">
                              <label
                                htmlFor={`${fk}-label`}
                                className="text-xs font-medium text-muted-foreground"
                              >
                                Option name
                              </label>
                              <Input
                                id={`${fk}-label`}
                                value={variant.label}
                                onChange={(e) =>
                                  updateVariantMeta(row.assignmentId, variant.id, {
                                    label: e.target.value,
                                  })
                                }
                                placeholder="e.g. With diamonds"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label
                                htmlFor={`${fk}-description`}
                                className="text-xs font-medium text-muted-foreground"
                              >
                                Option description (optional)
                              </label>
                              <Textarea
                                id={`${fk}-description`}
                                rows={2}
                                value={variant.description}
                                onChange={(e) =>
                                  updateVariantMeta(row.assignmentId, variant.id, {
                                    description: e.target.value,
                                  })
                                }
                                placeholder="Details about this option..."
                              />
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Remove option"
                            onClick={() =>
                              removeVariant(row.assignmentId, variant.id)
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
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
                            Cannot quote this option
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
                            placeholder="Describe the product you are quoting for this option..."
                            className="block w-full min-h-24 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
                          />
                        </div>

                        <div>
                          <p className="text-sm font-semibold text-foreground mb-3">
                            Cost breakdown
                          </p>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                            {QUOTE_TOTAL_SUM_KEYS.filter((k) => k !== "labor" && k !== "other_fees").map((col) => (
                              <div key={col} className="space-y-1.5">
                                <label
                                  htmlFor={`${fk}-${col}`}
                                  className="text-xs font-medium text-muted-foreground"
                                >
                                  {COST_LABELS[col]}
                                </label>
                                <input
                                  id={`${fk}-${col}`}
                                  name={costFieldName(
                                    row.assignmentId,
                                    variant.id,
                                    col
                                  )}
                                  type="text"
                                  inputMode="decimal"
                                  autoComplete="off"
                                  defaultValue={
                                    initialRef.current.values[fk]?.[col] ?? ""
                                  }
                                  onInput={(e) =>
                                    handleCostInput(
                                      fk,
                                      col,
                                      e.currentTarget.value
                                    )
                                  }
                                  className="block h-11 w-full cursor-text rounded-lg border border-input bg-background px-3 text-base tabular-nums text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                                />
                              </div>
                            ))}
                          </div>

                          <div className="mt-4 rounded-lg border border-border bg-background/60 p-4 space-y-4">
                            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                              <div>
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                  Stone types
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  Add each stone type with cost per carat and total
                                  carats. Totals are summed automatically.
                                </p>
                              </div>
                              <div className="space-y-1 shrink-0">
                                <p className="text-xs font-medium text-muted-foreground">
                                  Diamond cost (total)
                                </p>
                                <p className="h-11 flex items-center px-3 rounded-lg border border-input bg-muted/40 text-base tabular-nums font-medium">
                                  {diamondTotal
                                    ? Number(diamondTotal).toLocaleString(
                                        undefined,
                                        {
                                          minimumFractionDigits: 2,
                                          maximumFractionDigits: 2,
                                        }
                                      )
                                    : "—"}
                                </p>
                              </div>
                            </div>

                            <div className="space-y-3">
                              {stones.map((stone, stoneIdx) => {
                                const lineTotal = (() => {
                                  const p = Number(stone.cost_per_carat);
                                  const c = Number(stone.total_carats);
                                  if (!Number.isFinite(p) || !Number.isFinite(c))
                                    return null;
                                  return p * c;
                                })();

                                return (
                                  <div
                                    key={stone.id}
                                    className="rounded-lg border border-border/80 bg-background p-3 space-y-3"
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <p className="text-xs font-medium text-muted-foreground">
                                        Stone {stoneIdx + 1}
                                      </p>
                                      {stones.length > 1 && (
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon-sm"
                                          aria-label="Remove stone type"
                                          onClick={() =>
                                            removeStoneLine(fk, stone.id)
                                          }
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                      )}
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                      <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
                                        <label
                                          htmlFor={`${fk}-stone-${stone.id}-label`}
                                          className="text-xs font-medium text-muted-foreground"
                                        >
                                          Stone type
                                        </label>
                                        <input
                                          id={`${fk}-stone-${stone.id}-label`}
                                          type="text"
                                          autoComplete="off"
                                          value={stone.label}
                                          onChange={(e) =>
                                            updateStoneLine(fk, stone.id, {
                                              label: e.target.value,
                                            })
                                          }
                                          placeholder="e.g. Round diamonds"
                                          className="block h-11 w-full cursor-text rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                                        />
                                      </div>
                                      <div className="space-y-1.5">
                                        <label
                                          htmlFor={`${fk}-stone-${stone.id}-per`}
                                          className="text-xs font-medium text-muted-foreground"
                                        >
                                          Cost per carat
                                        </label>
                                        <input
                                          id={`${fk}-stone-${stone.id}-per`}
                                          type="text"
                                          inputMode="decimal"
                                          autoComplete="off"
                                          value={stone.cost_per_carat}
                                          onChange={(e) =>
                                            updateStoneLine(fk, stone.id, {
                                              cost_per_carat: e.target.value,
                                            })
                                          }
                                          className="block h-11 w-full cursor-text rounded-lg border border-input bg-background px-3 text-base tabular-nums text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                                        />
                                      </div>
                                      <div className="space-y-1.5">
                                        <label
                                          htmlFor={`${fk}-stone-${stone.id}-carats`}
                                          className="text-xs font-medium text-muted-foreground"
                                        >
                                          Total carats
                                        </label>
                                        <input
                                          id={`${fk}-stone-${stone.id}-carats`}
                                          type="text"
                                          inputMode="decimal"
                                          autoComplete="off"
                                          value={stone.total_carats}
                                          onChange={(e) =>
                                            updateStoneLine(fk, stone.id, {
                                              total_carats: e.target.value,
                                            })
                                          }
                                          className="block h-11 w-full cursor-text rounded-lg border border-input bg-background px-3 text-base tabular-nums text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                                        />
                                      </div>
                                      <div className="space-y-1.5">
                                        <p className="text-xs font-medium text-muted-foreground">
                                          Line total
                                        </p>
                                        <p className="h-11 flex items-center px-3 rounded-lg border border-dashed border-border bg-muted/20 text-sm tabular-nums">
                                          {lineTotal !== null
                                            ? lineTotal.toLocaleString(
                                                undefined,
                                                {
                                                  minimumFractionDigits: 2,
                                                  maximumFractionDigits: 2,
                                                }
                                              )
                                            : "—"}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => addStoneLine(fk)}
                            >
                              <Plus className="h-4 w-4 mr-1.5" />
                              Add stone type
                            </Button>
                          </div>

                          <div className="grid grid-cols-2 gap-3 sm:gap-4 mt-4">
                            {(["labor", "other_fees"] as const).map((col) => (
                              <div key={col} className="space-y-1.5">
                                <label
                                  htmlFor={`${fk}-${col}`}
                                  className="text-xs font-medium text-muted-foreground"
                                >
                                  {COST_LABELS[col]}
                                </label>
                                <input
                                  id={`${fk}-${col}`}
                                  name={costFieldName(
                                    row.assignmentId,
                                    variant.id,
                                    col
                                  )}
                                  type="text"
                                  inputMode="decimal"
                                  autoComplete="off"
                                  defaultValue={
                                    initialRef.current.values[fk]?.[col] ?? ""
                                  }
                                  onInput={(e) =>
                                    handleCostInput(
                                      fk,
                                      col,
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
                            {computeDisplayTotal(
                              displayValues,
                              stones
                            ).toLocaleString(
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
                  })
                )}

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addVariant(row.assignmentId)}
                >
                  <Plus className="h-4 w-4 mr-1.5" />
                  Add variant
                </Button>
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

      <div className="flex flex-col items-stretch justify-between gap-3 border-t pt-4 sm:flex-row sm:items-center">
        <p className="text-xs text-muted-foreground max-w-md">
          Add one or more quote options per item, then submit once at the bottom.
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
