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
  type AwardRow = { factory_id: string; quantity: number; size: string; gold_color: string; gemstone: string; other_comments: string };
  const [awards, setAwards] = useState<Record<string, AwardRow[]>>(() => {
    const initial: Record<string, AwardRow[]> = {};
    for (const item of items) {
      const quotes = quotesByItemAndFactory[item.id];
      if (!quotes) continue;
      let best: { factoryId: string; total: number } | null = null;
      for (const [fid, q] of Object.entries(quotes)) {
        const t = quoteTotal(q);
        if (t <= 0) continue;
        if (!best || t < best.total) best = { factoryId: fid, total: t };
      }
      if (best) initial[item.id] = [{ factory_id: best.factoryId, quantity: 1, size: "", gold_color: "", gemstone: "", other_comments: "" }];
    }
    return initial;
  });

  function updateAward(item_id: string, idx: number, patch: Partial<AwardRow>) {
    setAwards((prev) => {
      const rows = [...(prev[item_id] ?? [])];
      rows[idx] = { ...rows[idx], ...patch };
      return { ...prev, [item_id]: rows };
    });
  }
  function addAwardRow(item_id: string) {
    setAwards((prev) => ({
      ...prev,
      [item_id]: [...(prev[item_id] ?? []), { factory_id: prev[item_id]?.[0]?.factory_id ?? "", quantity: 1, size: "", gold_color: "", gemstone: "", other_comments: "" }],
    }));
  }
  function removeAwardRow(item_id: string, idx: number) {
    setAwards((prev) => {
      const rows = (prev[item_id] ?? []).filter((_, i) => i !== idx);
      if (rows.length === 0) {
        const next = { ...prev };
        delete next[item_id];
        return next;
      }
      return { ...prev, [item_id]: rows };
    });
  }
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
    const payload: AwardInput[] = [];
    for (const [item_id, rows] of Object.entries(awards)) {
      for (const v of rows) {
        if (!v.factory_id) continue;
        const quote = quotesByItemAndFactory[item_id]?.[v.factory_id];
        payload.push({
          item_id,
          factory_id: v.factory_id,
          quote_id: quote?.id ?? null,
          quantity: v.quantity,
          size: v.size || undefined,
          gold_color: v.gold_color || undefined,
          gemstone: v.gemstone || undefined,
          other_comments: v.other_comments || undefined,
        });
      }
    }

    if (payload.length === 0) {
      setErr("Select at least one winner with quantity ≥ 1.");
      return;
    }

    startTransition(async () => {
      const res = await generatePurchaseOrders(quotationId, payload);
      if (!res.ok) setErr(res.error);
    });
  }

  const awardsCount = Object.values(awards).reduce((s, rows) => s + rows.length, 0);
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
              <th className="px-3 py-3 eyebrow text-[10px] text-right min-w-[80px] bg-muted/60 border-b">
                Qty
              </th>
              <th className="px-3 py-3 eyebrow text-[10px] text-left min-w-[100px] bg-muted/60 border-b">
                Size
              </th>
              <th className="px-3 py-3 eyebrow text-[10px] text-left min-w-[120px] bg-muted/60 border-b">
                Gold Color
              </th>
              <th className="px-3 py-3 eyebrow text-[10px] text-left min-w-[120px] bg-muted/60 border-b">
                Gemstone
              </th>
              <th className="px-3 py-3 eyebrow text-[10px] text-left min-w-[150px] bg-muted/60 border-b">
                Other
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIdx) => {
              const itemAwards = awards[row.item.id] ?? [];
              const rowBg = rowIdx % 2 === 0 ? "bg-background" : "bg-muted/30";
              const fixedCols = 2 + sortedFactories.length; // item + best total + factory cols

              const AwardCells = ({ awd, idx }: { awd: AwardRow; idx: number }) => (
                <>
                  <td className="px-3 py-2 border-b">
                    <Select
                      value={awd.factory_id}
                      onValueChange={(v) => updateAward(row.item.id, idx, { factory_id: v ?? "" })}
                    >
                      <SelectTrigger className="h-9 min-w-[140px]">
                        <SelectValue placeholder="No winner">
                          {(v: unknown): React.ReactNode =>
                            (typeof v === "string" && v &&
                              sortedFactories.find((x) => x.id === v)?.name) ||
                            "No winner"
                          }
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {sortedFactories.map((f) => (
                          <SelectItem key={f.id} value={f.id}>
                            {f.name}
                            {!row.byFactory[f.id] && (
                              <span className="text-muted-foreground ml-1">(sin quote)</span>
                            )}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-3 py-2 border-b">
                    <Input type="number" min="1" className="h-9 w-20 text-right tabular-nums"
                      value={awd.quantity}
                      onChange={(e) => updateAward(row.item.id, idx, { quantity: Math.max(1, Number(e.target.value) || 1) })}
                    />
                  </td>
                  {(["size", "gold_color", "gemstone", "other_comments"] as const).map((field) => (
                    <td key={field} className="px-3 py-2 border-b">
                      <Input className="h-9 min-w-[90px]"
                        value={awd[field]}
                        onChange={(e) => updateAward(row.item.id, idx, { [field]: e.target.value })}
                      />
                    </td>
                  ))}
                  <td className="px-2 py-2 border-b">
                    <button
                      type="button"
                      onClick={() => removeAwardRow(row.item.id, idx)}
                      className="h-9 w-9 flex items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      title="Remove row"
                    >
                      ×
                    </button>
                  </td>
                </>
              );

              return (
                <React.Fragment key={row.item.id}>
                  {/* Main item row */}
                  <tr className={rowBg}>
                    <td className={`px-4 py-3 sticky left-0 z-10 border-b ${rowBg}`}>
                      <div className="flex items-center gap-3">
                        {row.item.photo_url ? (
                          <Image src={row.item.photo_url} alt="" width={44} height={44}
                            className="h-11 w-11 object-cover rounded shrink-0" unoptimized />
                        ) : (
                          <div className="h-11 w-11 bg-muted rounded flex items-center justify-center shrink-0">
                            <ImageIcon className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                        <div className="truncate font-heading text-base">
                          {row.item.name || "(untitled)"}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right font-heading text-lg tabular-nums border-b">
                      {row.minTotal !== null ? fmt(row.minTotal) : <span className="text-muted-foreground">—</span>}
                    </td>
                    {sortedFactories.map((f) => {
                      const cell = row.byFactory[f.id];
                      const isMin = cell !== null && cell !== undefined && !cell.declined &&
                        row.minTotal !== null && cell.total === row.minTotal;
                      return (
                        <td key={f.id} className={`px-3 py-3 text-right tabular-nums border-b ${isMin ? "bg-green-50 dark:bg-green-950/30 font-semibold text-green-900 dark:text-green-100" : ""}`}>
                          {!cell ? <span className="text-muted-foreground">—</span>
                            : cell.declined ? <span className="text-[10px] text-muted-foreground uppercase tracking-[0.2em]">Declined</span>
                            : <div title={breakdown(cell.quote)}>{fmt(cell.total)}</div>}
                        </td>
                      );
                    })}
                    {/* First award row inline, or empty if no awards */}
                    {itemAwards[0] ? (
                      <AwardCells awd={itemAwards[0]} idx={0} />
                    ) : (
                      <>
                        <td className="px-3 py-3 border-b" colSpan={6}>
                          <button type="button" onClick={() => addAwardRow(row.item.id)}
                            className="text-xs text-muted-foreground hover:text-foreground transition-colors border border-dashed rounded px-3 py-1.5">
                            + Add order line
                          </button>
                        </td>
                      </>
                    )}
                  </tr>

                  {/* Additional award rows */}
                  {itemAwards.slice(1).map((awd, i) => (
                    <tr key={i + 1} className={rowBg}>
                      <td colSpan={fixedCols} className={`border-b ${rowBg}`} />
                      <AwardCells awd={awd} idx={i + 1} />
                    </tr>
                  ))}

                  {/* Add row button (only shown when at least 1 award exists) */}
                  {itemAwards.length > 0 && (
                    <tr className={rowBg}>
                      <td colSpan={fixedCols} className={`border-b ${rowBg}`} />
                      <td colSpan={7} className="px-3 py-1.5 border-b">
                        <button type="button" onClick={() => addAwardRow(row.item.id)}
                          className="text-xs text-muted-foreground hover:text-foreground transition-colors border border-dashed rounded px-3 py-1 w-full text-left">
                          + Add another line (different specs)
                        </button>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
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
