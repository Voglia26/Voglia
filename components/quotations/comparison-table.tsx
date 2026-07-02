"use client";

import * as React from "react";
import { useMemo, useState, useTransition } from "react";
import { ItemPhotos } from "@/components/items/item-photos";
import type { QuotationStatus } from "@/lib/types";
import {
  QUOTE_COLUMNS,
  quoteTotal,
  quoteHasValue,
  formatQuoteGrams,
  formatQuoteCostPerCarat,
  formatQuoteStoneCaratsLabel,
  itemRefCarats,
  type QuoteColumnKey,
} from "@/lib/types";
import type { CompareRow } from "@/app/admin/(dash)/quotations/[id]/compare/page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ArrowDown, ArrowUp, Loader2 } from "lucide-react";
import { generatePurchaseOrders, type AwardInput } from "@/app/admin/(dash)/quotations/[id]/compare/actions";

type SortKey = QuoteColumnKey | "total" | null;

export function ComparisonTable({
  quotationId,
  quotationStatus,
  rows,
}: {
  quotationId: string;
  quotationStatus: QuotationStatus;
  rows: CompareRow[];
}) {
  const [awards, setAwards] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    const bestByItem = new Map<string, { quoteId: string; total: number }>();
    for (const row of rows) {
      const total = quoteTotal(row.quote);
      if (!quoteHasValue(row.quote) || row.quote.declined) continue;
      const prev = bestByItem.get(row.item.id);
      if (!prev || total < prev.total) {
        bestByItem.set(row.item.id, { quoteId: row.quote.id, total });
      }
    }
    for (const { quoteId } of bestByItem.values()) {
      initial[quoteId] = 1;
    }
    return initial;
  });
  const [notesByItem, setNotesByItem] = useState<Record<string, string>>({});
  const [sortKey, setSortKey] = useState<SortKey>("total");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [submitting, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  const tableRows = useMemo(() => {
    const base = rows.map((row) => ({
      ...row,
      total: quoteTotal(row.quote),
      hasValue: quoteHasValue(row.quote) && !row.quote.declined,
    }));

    if (!sortKey) return base;

    const dir = sortDir === "asc" ? 1 : -1;
    return base.slice().sort((a, b) => {
      const pick = (row: (typeof base)[number]) => {
        if (sortKey === "total") return row.hasValue ? row.total : Infinity;
        const v = row.quote[sortKey];
        return v !== null && v !== undefined ? Number(v) : Infinity;
      };
      return (pick(a) - pick(b)) * dir;
    });
  }, [rows, sortKey, sortDir]);

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
    const payload: AwardInput[] = tableRows
      .map((row) => {
        const quantity = awards[row.quote.id];
        if (!quantity || quantity < 1) return null;
        return {
          variant_id: row.variant.id,
          item_id: row.item.id,
          factory_id: row.factory.id,
          quote_id: row.quote.id,
          quantity,
          notes: notesByItem[row.item.id]?.trim() || null,
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

  const awardsCount = Object.values(awards).filter((q) => q >= 1).length;
  const canGenerate =
    quotationStatus !== "closed" && awardsCount > 0 && !submitting;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="overflow-auto">
          <table className="w-full text-sm border-separate border-spacing-0">
            <thead>
              <tr>
                <th className="text-left px-4 py-3 eyebrow text-[10px] sticky left-0 bg-muted/60 z-20 min-w-[220px] border-b">
                  Item
                </th>
                <th className="text-left px-3 py-3 eyebrow text-[10px] min-w-[120px] bg-muted/60 border-b">
                  Factory
                </th>
                <th className="text-left px-3 py-3 eyebrow text-[10px] min-w-[180px] bg-muted/60 border-b">
                  Option
                </th>
                <SortableHeader
                  label="Total"
                  active={sortKey === "total"}
                  dir={sortDir}
                  onClick={() => toggleSort("total")}
                  align="right"
                />
                {QUOTE_COLUMNS.map((col) => (
                  <SortableHeader
                    key={col.key}
                    label={col.label}
                    active={sortKey === col.key}
                    dir={sortDir}
                    onClick={() => toggleSort(col.key)}
                    align="right"
                  />
                ))}
                <th className="px-3 py-3 eyebrow text-[10px] text-right min-w-[90px] bg-muted/60 border-b">
                  Qty
                </th>
                <th className="px-3 py-3 eyebrow text-[10px] min-w-[180px] bg-muted/60 border-b">
                  Details / Notes
                </th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map((row, rowIdx) => {
                const rowBg = rowIdx % 2 === 0 ? "bg-background" : "bg-muted/30";
                const prevItemId =
                  rowIdx > 0 ? tableRows[rowIdx - 1].item.id : null;
                const showItemHeader = row.item.id !== prevItemId;
                const qty = awards[row.quote.id] ?? "";
                const refCarats = itemRefCarats(row.item);
                const gramsLabel = row.hasValue
                  ? formatQuoteGrams(row.quote, row.item.specs?.weight_g ?? null)
                  : null;
                const quotedCaratsLabel = row.hasValue
                  ? formatQuoteStoneCaratsLabel(row.quote)
                  : null;
                const costPerCaratLabel = row.hasValue
                  ? formatQuoteCostPerCarat(row.total, refCarats)
                  : null;

                return (
                  <tr key={row.quote.id} className={rowBg}>
                    <td
                      className={`px-4 py-3 sticky left-0 z-10 border-b ${rowBg}`}
                    >
                      <div className="flex items-start gap-3">
                        {showItemHeader ? (
                          <ItemPhotos
                            urls={row.item.photo_urls}
                            size="sm"
                            limit={1}
                          />
                        ) : (
                          <div className="w-10 shrink-0" />
                        )}
                        <div className="min-w-0">
                          {showItemHeader && (
                            <div className="truncate font-heading text-base">
                              {row.item.name || "(untitled)"}
                            </div>
                          )}
                          {showItemHeader &&
                            (row.item.specs?.weight_g !== null &&
                              row.item.specs?.weight_g !== undefined) ||
                            refCarats !== null ? (
                              <p className="text-[11px] text-muted-foreground tabular-nums">
                                {[
                                  row.item.specs?.weight_g !== null &&
                                  row.item.specs?.weight_g !== undefined
                                    ? `Ref. ${row.item.specs.weight_g}g`
                                    : null,
                                  refCarats !== null ? `Ref. ${refCarats} ct` : null,
                                ]
                                  .filter(Boolean)
                                  .join(" · ")}
                              </p>
                            ) : null}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 border-b font-medium">
                      {row.factory.name}
                    </td>
                    <td className="px-3 py-3 border-b">
                      <div className="font-medium">{row.variant.label}</div>
                      {row.variant.description ? (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {row.variant.description}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-3 py-3 text-right border-b align-top">
                      {!row.hasValue ? (
                        row.quote.declined ? (
                          <span className="text-[10px] text-muted-foreground uppercase tracking-[0.2em]">
                            Declined
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )
                      ) : (
                        <div className="inline-block text-right min-w-[4.5rem]">
                          <div className="font-heading text-lg tabular-nums leading-none">
                            {fmt(row.total)}
                          </div>
                          {gramsLabel && (
                            <p className="text-[11px] tabular-nums mt-1 leading-tight text-muted-foreground">
                              {gramsLabel}
                            </p>
                          )}
                          {quotedCaratsLabel && (
                            <p className="text-[11px] tabular-nums mt-1 leading-tight text-muted-foreground">
                              {quotedCaratsLabel}
                            </p>
                          )}
                          {costPerCaratLabel && (
                            <p className="text-[11px] tabular-nums mt-1 leading-tight text-muted-foreground">
                              {costPerCaratLabel}
                            </p>
                          )}
                        </div>
                      )}
                    </td>
                    {QUOTE_COLUMNS.map((col) => (
                      <td
                        key={col.key}
                        className="px-3 py-3 text-right tabular-nums border-b text-muted-foreground"
                      >
                        {row.quote[col.key] !== null &&
                        row.quote[col.key] !== undefined
                          ? fmt(Number(row.quote[col.key]))
                          : "—"}
                      </td>
                    ))}
                    <td className="px-3 py-3 text-right border-b">
                      {row.hasValue ? (
                        <Input
                          type="number"
                          min="0"
                          className="h-9 w-20 ml-auto text-right tabular-nums"
                          value={qty}
                          onChange={(e) => {
                            const raw = e.target.value;
                            setAwards((prev) => {
                              const next = { ...prev };
                              if (!raw || Number(raw) < 1) {
                                delete next[row.quote.id];
                              } else {
                                next[row.quote.id] = Math.max(
                                  1,
                                  Number(raw) || 1
                                );
                              }
                              return next;
                            });
                          }}
                        />
                      ) : (
                        <Badge variant="outline">—</Badge>
                      )}
                    </td>
                    <td className="px-3 py-3 border-b align-top">
                      {showItemHeader ? (
                        <Textarea
                          rows={2}
                          className="text-xs min-h-[56px] resize-y"
                          placeholder="e.g. 5× YG, 3× WG, size 7…"
                          disabled={quotationStatus === "closed"}
                          value={notesByItem[row.item.id] ?? ""}
                          onChange={(e) =>
                            setNotesByItem((prev) => ({
                              ...prev,
                              [row.item.id]: e.target.value,
                            }))
                          }
                        />
                      ) : null}
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
          This quotation is already closed and purchase orders have been
          generated.
        </p>
      ) : (
        <div className="flex items-center justify-end gap-3 sticky bottom-0 bg-background pt-4 border-t">
          <p className="text-sm text-muted-foreground">
            {awardsCount} option{awardsCount !== 1 ? "s" : ""} selected
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
      className={`px-3 py-3 min-w-[100px] bg-muted/60 border-b text-${align}`}
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
