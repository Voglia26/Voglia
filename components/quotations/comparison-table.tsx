"use client";

import * as React from "react";
import { useMemo, useState, useTransition } from "react";
import Image from "next/image";
import type { Item, Factory, Quote, QuotationStatus } from "@/lib/types";
import {
  QUOTE_COLUMNS,
  quoteTotal,
  quoteHasValue,
  type QuoteColumnKey,
} from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ImageIcon, ArrowDown, ArrowUp, Loader2 } from "lucide-react";
import { generatePurchaseOrders, type AwardInput } from "@/app/admin/(dash)/quotations/[id]/compare/actions";

type SortKey = QuoteColumnKey | "total" | null;

export function ComparisonTable({
  quotationId,
  quotationStatus,
  items,
  factories,
  quotesByItemAndFactory,
}: {
  quotationId: string;
  quotationStatus: QuotationStatus;
  items: Item[];
  factories: Factory[];
  quotesByItemAndFactory: Record<string, Record<string, Quote>>;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("total");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [awards, setAwards] = useState<
    Record<string, { factory_id: string; quantity: number }>
  >(() => {
    const initial: Record<string, { factory_id: string; quantity: number }> = {};
    for (const item of items) {
      const quotes = quotesByItemAndFactory[item.id];
      if (!quotes) continue;
      let best: { factoryId: string; total: number } | null = null;
      for (const [fid, q] of Object.entries(quotes)) {
        const t = quoteTotal(q);
        if (t <= 0) continue;
        if (!best || t < best.total) best = { factoryId: fid, total: t };
      }
      if (best) initial[item.id] = { factory_id: best.factoryId, quantity: 1 };
    }
    return initial;
  });
  const [submitting, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  const sortedFactories = useMemo(() => factories.slice(), [factories]);

  const rows = useMemo(() => {
    const base = items.map((item) => {
      const quotes = quotesByItemAndFactory[item.id] ?? {};
      const byFactory: Record<
        string,
        { quote: Quote; total: number; declined: boolean } | null
      > = {};
      for (const f of factories) {
        const q = quotes[f.id];
        byFactory[f.id] = q
          ? {
              quote: q,
              total: quoteTotal(q),
              declined: !!q.declined,
            }
          : null;
      }
      const validTotals = Object.values(byFactory).flatMap((v) =>
        v && !v.declined && quoteHasValue(v.quote) ? [v.total] : []
      );
      const minTotal = validTotals.length > 0 ? Math.min(...validTotals) : null;
      return { item, byFactory, minTotal };
    });

    if (!sortKey) return base;

    const dir = sortDir === "asc" ? 1 : -1;
    return base.slice().sort((a, b) => {
      const pick = (row: (typeof base)[number]) => {
        if (sortKey === "total") return row.minTotal ?? Infinity;
        const f = factories[0];
        if (!f) return Infinity;
        const q = row.byFactory[f.id]?.quote;
        return q && q[sortKey] !== null && q[sortKey] !== undefined
          ? Number(q[sortKey])
          : Infinity;
      };
      return (pick(a) - pick(b)) * dir;
    });
  }, [items, factories, quotesByItemAndFactory, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function handleGenerate() {
    setErr(null);
    const payload: AwardInput[] = Object.entries(awards)
      .map(([item_id, v]) => {
        const quote = quotesByItemAndFactory[item_id]?.[v.factory_id];
        if (!quote) return null;
        return {
          item_id,
          factory_id: v.factory_id,
          quote_id: quote.id,
          quantity: v.quantity,
        };
      })
      .filter((x): x is AwardInput => x !== null);

    if (payload.length === 0) {
      setErr("Select at least one winner with quantity ≥ 1.");
      return;
    }

    startTransition(async () => {
      const res = await generatePurchaseOrders(quotationId, payload);
      if (!res.ok) setErr(res.error);
    });
  }

  const awardsCount = Object.keys(awards).length;
  const canGenerate =
    quotationStatus !== "closed" && awardsCount > 0 && !submitting;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="overflow-auto">
          <table className="w-full text-sm border-separate border-spacing-0">
            <thead>
            <tr>
              <th className="text-left px-4 py-3 eyebrow text-[10px] sticky left-0 bg-muted/60 z-20 min-w-[240px] border-b">
                Item
              </th>
              <SortableHeader
                label="Best total"
                active={sortKey === "total"}
                dir={sortDir}
                onClick={() => toggleSort("total")}
                align="right"
              />
              {sortedFactories.map((f) => (
                <th
                  key={f.id}
                  className="px-3 py-3 eyebrow text-[10px] text-right min-w-[140px] bg-muted/60 border-b"
                >
                  <span className="font-heading text-base normal-case tracking-normal">
                    {f.name}
                  </span>
                </th>
              ))}
              <th className="px-3 py-3 eyebrow text-[10px] text-left min-w-[180px] bg-muted/60 border-b">
                Award to
              </th>
              <th className="px-3 py-3 eyebrow text-[10px] text-right min-w-[90px] bg-muted/60 border-b">
                Qty
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIdx) => {
              const award = awards[row.item.id];
              const quotingFactoryIds = sortedFactories
                .filter((f) => row.byFactory[f.id])
                .map((f) => f.id);

              const rowBg = rowIdx % 2 === 0 ? "bg-background" : "bg-muted/30";
              return (
                <tr key={row.item.id} className={rowBg}>
                  <td
                    className={`px-4 py-3 sticky left-0 z-10 border-b ${rowBg}`}
                  >
                    <div className="flex items-center gap-3">
                      {row.item.photo_url ? (
                        <Image
                          src={row.item.photo_url}
                          alt=""
                          width={44}
                          height={44}
                          className="h-11 w-11 object-cover rounded shrink-0"
                          unoptimized
                        />
                      ) : (
                        <div className="h-11 w-11 bg-muted rounded flex items-center justify-center shrink-0">
                          <ImageIcon className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="truncate font-heading text-base">
                          {row.item.name || "(untitled)"}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-right font-heading text-lg tabular-nums border-b">
                    {row.minTotal !== null ? fmt(row.minTotal) : <span className="text-muted-foreground">—</span>}
                  </td>
                  {sortedFactories.map((f) => {
                    const cell = row.byFactory[f.id];
                    const isMin =
                      cell !== null &&
                      cell !== undefined &&
                      !cell.declined &&
                      row.minTotal !== null &&
                      cell.total === row.minTotal;
                    return (
                      <td
                        key={f.id}
                        className={`px-3 py-3 text-right tabular-nums border-b ${
                          isMin
                            ? "bg-green-50 dark:bg-green-950/30 font-semibold text-green-900 dark:text-green-100"
                            : ""
                        }`}
                      >
                        {!cell ? (
                          <span className="text-muted-foreground">—</span>
                        ) : cell.declined ? (
                          <span className="text-[10px] text-muted-foreground uppercase tracking-[0.2em]">
                            Declined
                          </span>
                        ) : (
                          <div title={breakdown(cell.quote)}>
                            {fmt(cell.total)}
                          </div>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-3 py-3 border-b">
                    {quotingFactoryIds.length > 0 ? (
                      <Select
                        value={award?.factory_id ?? ""}
                        onValueChange={(v) =>
                          setAwards((prev) => {
                            const next = { ...prev };
                            if (!v) delete next[row.item.id];
                            else
                              next[row.item.id] = {
                                factory_id: v,
                                quantity: prev[row.item.id]?.quantity ?? 1,
                              };
                            return next;
                          })
                        }
                      >
                        <SelectTrigger className="h-9 min-w-[140px]">
                          <SelectValue placeholder="No winner">
                            {(v: unknown): React.ReactNode =>
                              (typeof v === "string" &&
                                v &&
                                sortedFactories.find((x) => x.id === v)?.name) ||
                              "No winner"
                            }
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {quotingFactoryIds.map((fid) => {
                            const f = sortedFactories.find((x) => x.id === fid)!;
                            return (
                              <SelectItem key={fid} value={fid}>
                                {f.name}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge variant="outline">No quotes</Badge>
                    )}
                  </td>
                  <td className="px-3 py-3 text-right border-b">
                    <Input
                      type="number"
                      min="1"
                      className="h-9 w-20 ml-auto text-right tabular-nums"
                      disabled={!award}
                      value={award?.quantity ?? ""}
                      onChange={(e) => {
                        const q = Math.max(1, Number(e.target.value) || 1);
                        setAwards((prev) => ({
                          ...prev,
                          [row.item.id]: {
                            factory_id:
                              prev[row.item.id]?.factory_id ??
                              quotingFactoryIds[0],
                            quantity: q,
                          },
                        }));
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

      {err && (
        <p className="text-sm text-destructive">{err}</p>
      )}

      {quotationStatus === "closed" ? (
        <p className="text-sm text-muted-foreground">
          This quotation is already closed and purchase orders have been generated.
        </p>
      ) : (
        <div className="flex items-center justify-end gap-3 sticky bottom-0 bg-background pt-4 border-t">
          <p className="text-sm text-muted-foreground">
            {awardsCount} item{awardsCount !== 1 ? "s" : ""} selected
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

function SortableHeader({
  label,
  active,
  dir,
  onClick,
  align = "left",
}: {
  label: string;
  active: boolean;
  dir: "asc" | "desc";
  onClick: () => void;
  align?: "left" | "right";
}) {
  return (
    <th
      className={`px-3 py-3 min-w-[130px] bg-muted/60 border-b text-${align}`}
    >
      <button
        type="button"
        onClick={onClick}
        className={`eyebrow text-[10px] inline-flex items-center gap-1 ${
          align === "right" ? "justify-end" : ""
        } hover:text-foreground transition-colors ${
          active ? "text-foreground" : ""
        }`}
      >
        {label}
        {active ? (
          dir === "asc" ? (
            <ArrowUp className="h-3 w-3" />
          ) : (
            <ArrowDown className="h-3 w-3" />
          )
        ) : null}
      </button>
    </th>
  );
}

function fmt(n: number): string {
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function breakdown(q: Quote): string {
  return QUOTE_COLUMNS.map((c) => {
    const v = q[c.key];
    return `${c.label}: ${v ?? "—"}`;
  }).join("\n");
}
