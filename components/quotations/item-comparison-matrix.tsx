"use client";

import * as React from "react";
import { useMemo, useState, useTransition } from "react";
import type { QuotationStatus } from "@/lib/types";
import type { ItemCompareRow, QuoteOption } from "@/lib/quotation-compare";
import { bestValidOption } from "@/lib/quotation-compare";
import { ItemPhotos } from "@/components/items/item-photos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

function factoryBestPrice(row: ItemCompareRow, factoryId: string): number | null {
  const best = bestValidOption(row.byFactoryId[factoryId] ?? []);
  return best?.total ?? null;
}

function initAwards(rows: ItemCompareRow[], factories: FactoryCol[]): Record<string, ItemAward> {
  const initial: Record<string, ItemAward> = {};
  for (const row of rows) {
    let best: { factoryId: string; quoteId: string; total: number } | null = null;
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

function FactoryPriceCell({
  options,
  minTotal,
}: {
  options: QuoteOption[];
  minTotal: number | null;
}) {
  const quoted = validOptions(options);
  const allDeclined =
    options.length > 0 && options.every((o) => o.declined);

  if (quoted.length === 0) {
    return (
      <span className="text-xs text-muted-foreground">
        {allDeclined ? "Rechazado" : "—"}
      </span>
    );
  }

  return (
    <div className="space-y-2">
      {quoted.map((o) => {
        const isMin = minTotal !== null && o.total === minTotal;
        return (
          <div
            key={o.quoteId}
            className={cn(
              "rounded-md px-2 py-1.5",
              isMin && "bg-green-50 dark:bg-green-950/40 ring-1 ring-green-600/20"
            )}
          >
            <div
              className={cn(
                "font-heading text-base tabular-nums leading-none",
                isMin && "text-green-900 dark:text-green-100 font-semibold"
              )}
            >
              {fmt(o.total)}
            </div>
            {quoted.length > 1 && (
              <div className="text-[10px] text-muted-foreground mt-1 leading-tight line-clamp-2">
                {o.variantLabel}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

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
  const [submitting, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  const rowMinTotals = useMemo(() => {
    const out: Record<string, number | null> = {};
    for (const row of rows) {
      let min: number | null = null;
      for (const f of factories) {
        const price = factoryBestPrice(row, f.id);
        if (price === null) continue;
        if (min === null || price < min) min = price;
      }
      out[row.item.id] = min;
    }
    return out;
  }, [rows, factories]);

  function factoriesWithQuotes(row: ItemCompareRow) {
    return factories.filter((f) => validOptions(row.byFactoryId[f.id] ?? []).length > 0);
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
        };
      })
      .filter((x): x is AwardInput => x !== null);

    if (payload.length === 0) {
      setErr("Seleccioná al menos un ganador con cantidad ≥ 1.");
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
        No hay fábricas asignadas a esta cotización.
      </p>
    );
  }

  const stickyProduct =
    "sticky left-0 z-30 min-w-[220px] w-[220px] max-w-[220px] border-r border-border/80 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.12)]";
  const stickyWinner =
    "sticky right-[72px] z-30 min-w-[200px] w-[200px] border-l border-border/80 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.12)]";
  const stickyQty =
    "sticky right-0 z-30 min-w-[72px] w-[72px] border-l border-border/80 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.12)]";

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-max min-w-full text-sm border-separate border-spacing-0">
            <thead>
              <tr>
                <th
                  className={cn(
                    "text-left px-4 py-3 eyebrow text-[10px] bg-muted/80 backdrop-blur-sm border-b",
                    stickyProduct
                  )}
                >
                  Producto
                </th>
                {factories.map((f) => (
                  <th
                    key={f.id}
                    className="px-3 py-3 eyebrow text-[10px] text-right min-w-[130px] bg-muted/60 border-b"
                  >
                    <span className="font-heading text-sm normal-case tracking-normal">
                      {f.name}
                    </span>
                  </th>
                ))}
                <th
                  className={cn(
                    "px-3 py-3 eyebrow text-[10px] text-left bg-muted/80 backdrop-blur-sm border-b",
                    stickyWinner
                  )}
                >
                  Ganador
                </th>
                <th
                  className={cn(
                    "px-3 py-3 eyebrow text-[10px] text-right bg-muted/80 backdrop-blur-sm border-b",
                    stickyQty
                  )}
                >
                  Cant.
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIdx) => {
                const rowBg = rowIdx % 2 === 0 ? "bg-background" : "bg-muted/30";
                const award = awards[row.item.id];
                const quotingFactories = factoriesWithQuotes(row);
                const minTotal = rowMinTotals[row.item.id];
                const selectedOptions = award
                  ? validOptions(row.byFactoryId[award.factoryId] ?? [])
                  : [];
                const selectedOption = award
                  ? selectedOptions.find((o) => o.quoteId === award.quoteId)
                  : null;

                return (
                  <tr key={row.item.id} className={rowBg}>
                    <td
                      className={cn(
                        "px-4 py-3 align-top border-b",
                        stickyProduct,
                        rowBg
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <ItemPhotos
                          urls={row.item.photo_urls}
                          size="sm"
                          limit={1}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="font-heading text-sm leading-snug wrap-break-word">
                            {row.item.name || "(sin nombre)"}
                          </p>
                        </div>
                      </div>
                    </td>
                    {factories.map((f) => (
                      <td
                        key={f.id}
                        className="px-3 py-3 text-right align-top border-b tabular-nums"
                      >
                        <FactoryPriceCell
                          options={row.byFactoryId[f.id] ?? []}
                          minTotal={minTotal}
                        />
                      </td>
                    ))}
                    <td
                      className={cn(
                        "px-3 py-3 align-top border-b",
                        stickyWinner,
                        rowBg
                      )}
                    >
                      {quotingFactories.length > 0 ? (
                        <div className="space-y-2">
                          <Select
                            value={award?.factoryId ?? ""}
                            onValueChange={(factoryId) => {
                              const options =
                                row.byFactoryId[factoryId as string] ?? [];
                              const best = bestValidOption(options);
                              setAwards((prev) => ({
                                ...prev,
                                [row.item.id]: {
                                  factoryId: factoryId as string,
                                  quoteId:
                                    best?.quoteId ??
                                    validOptions(options)[0]?.quoteId ??
                                    "",
                                  quantity: prev[row.item.id]?.quantity ?? 1,
                                },
                              }));
                            }}
                          >
                            <SelectTrigger className="h-9 w-full">
                              <SelectValue placeholder="Elegir fábrica" />
                            </SelectTrigger>
                            <SelectContent>
                              {quotingFactories.map((f) => {
                                const price = factoryBestPrice(row, f.id);
                                return (
                                  <SelectItem key={f.id} value={f.id}>
                                    {f.name}
                                    {price !== null ? ` — ${fmt(price)}` : ""}
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                          {selectedOptions.length > 1 && award && (
                            <Select
                              value={award.quoteId}
                              onValueChange={(quoteId) =>
                                setAwards((prev) => ({
                                  ...prev,
                                  [row.item.id]: {
                                    ...prev[row.item.id],
                                    quoteId: quoteId as string,
                                  },
                                }))
                              }
                            >
                              <SelectTrigger className="h-8 w-full text-xs">
                                <SelectValue placeholder="Opción" />
                              </SelectTrigger>
                              <SelectContent>
                                {selectedOptions.map((o) => (
                                  <SelectItem key={o.quoteId} value={o.quoteId}>
                                    {o.variantLabel} — {fmt(o.total)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                          {selectedOption ? (
                            <p className="text-sm font-heading tabular-nums text-foreground">
                              {fmt(selectedOption.total)}
                            </p>
                          ) : null}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground leading-snug">
                          Sin cotizaciones
                        </p>
                      )}
                    </td>
                    <td
                      className={cn(
                        "px-3 py-3 text-right align-top border-b",
                        stickyQty,
                        rowBg
                      )}
                    >
                      <Input
                        type="number"
                        min="1"
                        className="h-9 w-14 ml-auto text-right tabular-nums"
                        disabled={!award}
                        value={award?.quantity ?? ""}
                        onChange={(e) => {
                          const q = Math.max(1, Number(e.target.value) || 1);
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
          Esta cotización ya está cerrada.
        </p>
      ) : (
        <div className="flex items-center justify-end gap-3 pt-2 border-t">
          <p className="text-sm text-muted-foreground">
            {awardsCount} producto{awardsCount !== 1 ? "s" : ""} adjudicado
            {awardsCount !== 1 ? "s" : ""}
          </p>
          <Button size="lg" onClick={handleGenerate} disabled={!canGenerate}>
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Generar órdenes de compra
          </Button>
        </div>
      )}
    </div>
  );
}
