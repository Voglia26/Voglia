"use client";

import { useMemo, useState, useTransition } from "react";
import type { QuotationStatus } from "@/lib/types";
import { formatGramsLabel, itemRefCarats } from "@/lib/types";
import type { ItemCompareRow, QuoteOption } from "@/lib/quotation-compare";
import { bestValidOption } from "@/lib/quotation-compare";
import { ItemPhotos } from "@/components/items/item-photos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  generatePurchaseOrders,
  type AwardInput,
} from "@/app/admin/(dash)/quotations/[id]/compare/actions";

type FactoryCol = { id: string; name: string };

type ItemAward = {
  factoryId: string;
  quoteId: string;
  quantity: number;
};

function fmt(n: number): string {
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function validOptions(options: QuoteOption[]): QuoteOption[] {
  return options.filter((o) => !o.declined && o.total > 0);
}

function initAwards(
  rows: ItemCompareRow[],
  factories: FactoryCol[]
): Record<string, ItemAward> {
  const initial: Record<string, ItemAward> = {};
  for (const row of rows) {
    let best: { factoryId: string; quoteId: string; total: number } | null =
      null;
    for (const f of factories) {
      const option = bestValidOption(row.byFactoryId[f.id] ?? []);
      if (!option) continue;
      if (!best || option.total < best.total) {
        best = {
          factoryId: f.id,
          quoteId: option.quoteId,
          total: option.total,
        };
      }
    }
    if (best) {
      initial[row.item.id] = {
        factoryId: best.factoryId,
        quoteId: best.quoteId,
        quantity: 1,
      };
    }
  }
  return initial;
}

function optionGramsLabel(option: QuoteOption): string | null {
  return (
    option.gramsLabel ??
    formatGramsLabel(option.weightG, option.lossG)
  );
}

function PriceCell({
  options,
  isLowest,
  isLowestWeight,
}: {
  options: QuoteOption[];
  isLowest: boolean;
  isLowestWeight: boolean;
}) {
  const quoted = validOptions(options);
  const allDeclined =
    options.length > 0 && options.every((o) => o.declined);

  if (quoted.length === 0) {
    return (
      <span className="text-muted-foreground text-sm">
        {allDeclined ? "Declined" : "—"}
      </span>
    );
  }

  const best = quoted.reduce((a, b) => (a.total <= b.total ? a : b));
  const grams = optionGramsLabel(best);
  const quotedCarats = best.quotedCaratsLabel;
  const costPerCarat = best.costPerCaratLabel;

  return (
    <div
      className={cn(
        "inline-block text-right min-w-[4.5rem]",
        isLowest && "rounded-md bg-green-50 px-2 py-1 dark:bg-green-950/40"
      )}
    >
      <div
        className={cn(
          "font-heading text-lg tabular-nums leading-none",
          isLowest && "font-semibold text-green-800 dark:text-green-200"
        )}
      >
        {fmt(best.total)}
      </div>
      <p
        className={cn(
          "text-[11px] tabular-nums mt-1 leading-tight",
          grams
            ? isLowestWeight
              ? "font-medium text-sky-800 dark:text-sky-200"
              : "text-muted-foreground"
            : "text-muted-foreground/50"
        )}
      >
        {grams ?? "—"}
      </p>
      {quotedCarats && (
        <p className="text-[11px] tabular-nums mt-1 leading-tight text-muted-foreground">
          {quotedCarats}
        </p>
      )}
      {costPerCarat && (
        <p className="text-[11px] tabular-nums mt-1 leading-tight text-muted-foreground">
          {costPerCarat}
        </p>
      )}
      {quoted.length > 1 && (
        <p className="text-[11px] text-muted-foreground mt-1 leading-tight">
          {best.variantLabel}
        </p>
      )}
    </div>
  );
}

const selectClass =
  "h-9 w-full rounded-md border border-input bg-background px-2 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50";

export function ItemComparisonMatrix({
  quotationId,
  quotationStatus,
  rows,
  factories,
}: {
  quotationId: string;
  quotationStatus: QuotationStatus;
  rows: ItemCompareRow[];
  factories: FactoryCol[];
}) {
  const [awards, setAwards] = useState<Record<string, ItemAward>>(() =>
    initAwards(rows, factories)
  );
  const [notesByItem, setNotesByItem] = useState<Record<string, string>>({});
  const [submitting, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  const rowMinTotals = useMemo(() => {
    const out: Record<string, number | null> = {};
    for (const row of rows) {
      let min: number | null = null;
      for (const f of factories) {
        const option = bestValidOption(row.byFactoryId[f.id] ?? []);
        if (!option) continue;
        if (min === null || option.total < min) min = option.total;
      }
      out[row.item.id] = min;
    }
    return out;
  }, [rows, factories]);

  const rowMinWeightG = useMemo(() => {
    const out: Record<string, number | null> = {};
    for (const row of rows) {
      let min: number | null = null;
      for (const f of factories) {
        const option = bestValidOption(row.byFactoryId[f.id] ?? []);
        if (!option?.weightG) continue;
        if (min === null || option.weightG < min) min = option.weightG;
      }
      out[row.item.id] = min;
    }
    return out;
  }, [rows, factories]);

  function factoriesWithQuotes(row: ItemCompareRow) {
    return factories.filter(
      (f) => validOptions(row.byFactoryId[f.id] ?? []).length > 0
    );
  }

  function setFactoryWinner(
    row: ItemCompareRow,
    factoryId: string,
    quoteId?: string
  ) {
    const options = validOptions(row.byFactoryId[factoryId] ?? []);
    const best = quoteId
      ? options.find((o) => o.quoteId === quoteId) ?? bestValidOption(options)
      : bestValidOption(options);
    if (!best) return;
    setAwards((prev) => ({
      ...prev,
      [row.item.id]: {
        factoryId,
        quoteId: best.quoteId,
        quantity: prev[row.item.id]?.quantity ?? 1,
      },
    }));
  }

  function handleGenerate() {
    setErr(null);
    const payload: AwardInput[] = rows
      .map((row) => {
        const award = awards[row.item.id];
        if (!award || award.quantity < 1) return null;
        const options = row.byFactoryId[award.factoryId] ?? [];
        const option = options.find((o) => o.quoteId === award.quoteId);
        if (!option || option.declined || option.total <= 0) return null;
        return {
          item_id: row.item.id,
          factory_id: award.factoryId,
          variant_id: option.variantId,
          quote_id: award.quoteId,
          quantity: award.quantity,
          notes: notesByItem[row.item.id]?.trim() || null,
        };
      })
      .filter((x): x is AwardInput => x !== null);

    if (payload.length === 0) {
      setErr("Pick at least one winner with quantity ≥ 1.");
      return;
    }

    startTransition(async () => {
      const res = await generatePurchaseOrders(quotationId, payload);
      if (!res.ok) setErr(res.error);
    });
  }

  const awardsCount = Object.values(awards).filter((a) => a.quantity >= 1).length;
  const canGenerate =
    quotationStatus !== "closed" && awardsCount > 0 && !submitting;

  if (factories.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No factories assigned to this quotation.
      </p>
    );
  }

  const factoryColWidth = `${Math.max(100, Math.min(140, 480 / factories.length))}px`;

  return (
    <div className="space-y-4">
      <div className="rounded-lg border">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-muted/50 border-b">
                <th className="text-left font-medium px-4 py-3 min-w-[200px] w-[28%]">
                  Product
                </th>
                {factories.map((f) => (
                  <th
                    key={f.id}
                    className="text-right font-medium px-3 py-3"
                    style={{ minWidth: factoryColWidth }}
                  >
                    <div>{f.name}</div>
                    <div className="text-[10px] font-normal text-muted-foreground mt-0.5">
                      Price · Grams
                    </div>
                  </th>
                ))}
                <th className="text-left font-medium px-4 py-3 min-w-[280px] w-[28%] border-l bg-muted/50">
                  Winner · Details
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => {
                const award = awards[row.item.id];
                const quotingFactories = factoriesWithQuotes(row);
                const minTotal = rowMinTotals[row.item.id];
                const minWeightG = rowMinWeightG[row.item.id];
                const refWeightG = row.item.specs?.weight_g;
                const refCarats = itemRefCarats(row.item);
                const variantOptions = award
                  ? validOptions(row.byFactoryId[award.factoryId] ?? [])
                  : [];

                return (
                  <tr
                    key={row.item.id}
                    className={cn(
                      "border-b last:border-b-0",
                      idx % 2 === 1 && "bg-muted/20"
                    )}
                  >
                    <td className="px-4 py-4 align-middle">
                      <div className="flex items-center gap-3">
                        <ItemPhotos
                          urls={row.item.photo_urls}
                          size="sm"
                          limit={1}
                        />
                        <div className="min-w-0">
                          <span className="font-medium leading-snug block">
                            {row.item.name || "(untitled)"}
                          </span>
                          {(refWeightG !== null && refWeightG !== undefined) ||
                          refCarats !== null ? (
                            <p className="text-[11px] text-muted-foreground mt-0.5 tabular-nums">
                              {[
                                refWeightG !== null && refWeightG !== undefined
                                  ? `Ref. ${refWeightG}g`
                                  : null,
                                refCarats !== null
                                  ? `Ref. ${refCarats} ct`
                                  : null,
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </td>

                    {factories.map((f) => {
                      const options = row.byFactoryId[f.id] ?? [];
                      const best = bestValidOption(options);
                      const isLowest =
                        best !== null &&
                        minTotal !== null &&
                        best.total === minTotal;
                      const isLowestWeight =
                        best !== null &&
                        best.weightG !== null &&
                        minWeightG !== null &&
                        best.weightG === minWeightG;

                      return (
                        <td
                          key={f.id}
                          className="px-3 py-4 text-right align-middle"
                        >
                          <PriceCell
                            options={options}
                            isLowest={isLowest}
                            isLowestWeight={isLowestWeight}
                          />
                        </td>
                      );
                    })}

                    <td className="px-4 py-4 align-middle border-l">
                      {quotingFactories.length === 0 ? (
                        <span className="text-sm text-muted-foreground">
                          No quotes
                        </span>
                      ) : (
                        <div className="space-y-2">
                          <select
                            className={selectClass}
                            value={award?.factoryId ?? ""}
                            onChange={(e) => {
                              const id = e.target.value;
                              if (!id) {
                                setAwards((prev) => {
                                  const next = { ...prev };
                                  delete next[row.item.id];
                                  return next;
                                });
                                return;
                              }
                              setFactoryWinner(row, id);
                            }}
                          >
                            <option value="">Select factory…</option>
                            {quotingFactories.map((f) => {
                              const best = bestValidOption(
                                row.byFactoryId[f.id] ?? []
                              );
                              return (
                                <option key={f.id} value={f.id}>
                                  {f.name}
                                  {best ? ` — ${fmt(best.total)}` : ""}
                                </option>
                              );
                            })}
                          </select>

                          {variantOptions.length > 1 && award && (
                            <select
                              className={cn(selectClass, "text-xs h-8")}
                              value={award.quoteId}
                              onChange={(e) =>
                                setFactoryWinner(
                                  row,
                                  award.factoryId,
                                  e.target.value
                                )
                              }
                            >
                              {variantOptions.map((o) => (
                                <option key={o.quoteId} value={o.quoteId}>
                                  {o.variantLabel} — {fmt(o.total)}
                                </option>
                              ))}
                            </select>
                          )}

                          <div className="flex items-center gap-2">
                            <label className="text-xs text-muted-foreground shrink-0">
                              Qty
                            </label>
                            <Input
                              type="number"
                              min={1}
                              className="h-8 w-16 text-right tabular-nums"
                              disabled={!award}
                              value={award?.quantity ?? ""}
                              onChange={(e) => {
                                const q = Math.max(
                                  1,
                                  Number(e.target.value) || 1
                                );
                                setAwards((prev) => {
                                  const cur = prev[row.item.id];
                                  if (!cur) return prev;
                                  return {
                                    ...prev,
                                    [row.item.id]: { ...cur, quantity: q },
                                  };
                                });
                              }}
                            />
                          </div>

                          {quotationStatus !== "closed" && (
                            <div className="space-y-1 pt-1">
                              <label
                                htmlFor={`compare-notes-${row.item.id}`}
                                className="text-xs text-muted-foreground"
                              >
                                Details / Notes
                              </label>
                              <Textarea
                                id={`compare-notes-${row.item.id}`}
                                rows={2}
                                className="min-h-[56px] text-xs text-foreground resize-y"
                                placeholder="e.g. 5× YG, 3× WG, size 7…"
                                value={notesByItem[row.item.id] ?? ""}
                                onChange={(e) =>
                                  setNotesByItem((prev) => ({
                                    ...prev,
                                    [row.item.id]: e.target.value,
                                  }))
                                }
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {err && <p className="text-sm text-destructive">{err}</p>}

      {quotationStatus === "closed" ? (
        <p className="text-sm text-muted-foreground">
          This quotation is already closed.
        </p>
      ) : (
        <div className="flex flex-wrap items-center justify-end gap-3 pt-2 border-t">
          <p className="text-sm text-muted-foreground mr-auto">
            {awardsCount} product{awardsCount !== 1 ? "s" : ""} awarded
          </p>
          <Button size="lg" onClick={handleGenerate} disabled={!canGenerate}>
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Generate purchase orders
          </Button>
        </div>
      )}
    </div>
  );
}
