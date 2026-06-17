"use client";

import * as React from "react";
import { useMemo, useState, useTransition } from "react";
import type { QuotationStatus } from "@/lib/types";
import type { ItemCompareRow } from "@/lib/quotation-compare";
import { bestValidOption } from "@/lib/quotation-compare";
import { ItemPhotos } from "@/components/items/item-photos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
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
        const option = bestValidOption(row.byFactoryId[f.id] ?? []);
        if (!option) continue;
        if (min === null || option.total < min) min = option.total;
      }
      out[row.item.id] = min;
    }
    return out;
  }, [rows, factories]);

  function factoriesWithQuotes(row: ItemCompareRow) {
    return factories.filter((f) =>
      (row.byFactoryId[f.id] ?? []).some(
        (o) => !o.declined && o.total > 0
      )
    );
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

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="overflow-auto">
          <table className="w-full text-sm border-separate border-spacing-0">
            <thead>
              <tr>
                <th className="text-left px-4 py-3 eyebrow text-[10px] sticky left-0 bg-muted/60 z-20 min-w-[200px] border-b">
                  Producto
                </th>
                {factories.map((f) => (
                  <th
                    key={f.id}
                    className="px-3 py-3 eyebrow text-[10px] text-right min-w-[120px] bg-muted/60 border-b"
                  >
                    <span className="font-heading text-sm normal-case tracking-normal">
                      {f.name}
                    </span>
                  </th>
                ))}
                <th className="px-3 py-3 eyebrow text-[10px] text-left min-w-[160px] bg-muted/60 border-b">
                  Ganador
                </th>
                <th className="px-3 py-3 eyebrow text-[10px] text-right min-w-[80px] bg-muted/60 border-b">
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
                  ? (row.byFactoryId[award.factoryId] ?? []).filter(
                      (o) => !o.declined && o.total > 0
                    )
                  : [];

                return (
                  <tr key={row.item.id} className={rowBg}>
                    <td
                      className={`px-4 py-3 sticky left-0 z-10 border-b ${rowBg}`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <ItemPhotos
                          urls={row.item.photo_urls}
                          size="sm"
                          limit={1}
                        />
                        <div className="min-w-0 truncate font-heading text-base">
                          {row.item.name || "(sin nombre)"}
                        </div>
                      </div>
                    </td>
                    {factories.map((f) => {
                      const options = row.byFactoryId[f.id] ?? [];
                      const best = bestValidOption(options);
                      const allDeclined =
                        options.length > 0 &&
                        options.every((o) => o.declined);
                      const isMin =
                        best !== null &&
                        minTotal !== null &&
                        best.total === minTotal;

                      return (
                        <td
                          key={f.id}
                          className={`px-3 py-3 text-right border-b tabular-nums ${
                            isMin
                              ? "bg-green-50 dark:bg-green-950/30 font-semibold text-green-900 dark:text-green-100"
                              : ""
                          }`}
                        >
                          {!best ? (
                            allDeclined ? (
                              <span className="text-[10px] text-muted-foreground uppercase tracking-[0.15em]">
                                Rechazado
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )
                          ) : (
                            <div>
                              <div className="font-heading text-base">
                                {fmt(best.total)}
                              </div>
                              {options.length > 1 && (
                                <div className="text-[10px] text-muted-foreground mt-0.5">
                                  {best.variantLabel}
                                  {options.filter((o) => !o.declined && o.total > 0).length > 1
                                    ? ` (+${options.filter((o) => !o.declined && o.total > 0).length - 1})`
                                    : null}
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-3 py-3 border-b">
                      {quotingFactories.length > 0 ? (
                        <div className="space-y-2">
                          <Select
                            value={award?.factoryId ?? ""}
                            onValueChange={(factoryId) => {
                              const options = row.byFactoryId[factoryId as string] ?? [];
                              const best = bestValidOption(options);
                              setAwards((prev) => ({
                                ...prev,
                                [row.item.id]: {
                                  factoryId: factoryId as string,
                                  quoteId:
                                    best?.quoteId ??
                                    options.find((o) => !o.declined)?.quoteId ??
                                    "",
                                  quantity: prev[row.item.id]?.quantity ?? 1,
                                },
                              }));
                            }}
                          >
                            <SelectTrigger className="h-9 min-w-[140px]">
                              <SelectValue placeholder="Sin ganador">
                                {(v: unknown): React.ReactNode =>
                                  (typeof v === "string" &&
                                    v &&
                                    factories.find((x) => x.id === v)?.name) ||
                                  "Sin ganador"
                                }
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {quotingFactories.map((f) => (
                                <SelectItem key={f.id} value={f.id}>
                                  {f.name}
                                </SelectItem>
                              ))}
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
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder="Opción">
                                  {(v: unknown): React.ReactNode => {
                                    if (typeof v !== "string" || !v) return "Opción";
                                    const o = selectedOptions.find(
                                      (x) => x.quoteId === v
                                    );
                                    return o
                                      ? `${o.variantLabel} (${fmt(o.total)})`
                                      : "Opción";
                                  }}
                                </SelectValue>
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
                        </div>
                      ) : (
                        <Badge variant="outline">Sin cotizaciones</Badge>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right border-b">
                      <Input
                        type="number"
                        min="1"
                        className="h-9 w-16 ml-auto text-right tabular-nums"
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
