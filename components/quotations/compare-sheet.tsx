"use client";

import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import type { QuotationStatus } from "@/lib/types";
import type { ItemCompareRow } from "@/lib/quotation-compare";
import { fetchQuotationCompareData } from "@/app/admin/(dash)/quotations/[id]/compare-data";
import { ItemComparisonMatrix } from "@/components/quotations/item-comparison-matrix";
import { Button } from "@/components/ui/button";
import { BarChart3, Loader2, XIcon } from "lucide-react";

type FactoryCol = { id: string; name: string };

const FULLSCREEN_STYLE: CSSProperties = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100vw",
  height: "100vh",
};

export function CompareSheet({
  quotationId,
  quotationStatus,
  rows: initialRows,
  factories: initialFactories,
  hasQuotes,
}: {
  quotationId: string;
  quotationStatus: QuotationStatus;
  rows: ItemCompareRow[];
  factories: FactoryCol[];
  hasQuotes: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [rows, setRows] = useState(initialRows);
  const [factories, setFactories] = useState(initialFactories);
  const [hasQuotesState, setHasQuotesState] = useState(hasQuotes);
  const [loading, setLoading] = useState(false);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetchQuotationCompareData(quotationId)
      .then((data) => {
        if (data) {
          setRows(data.rows);
          setFactories(data.factories);
          setHasQuotesState(data.hasQuotes);
        }
      })
      .finally(() => setLoading(false));
  }, [open, quotationId]);

  useEffect(() => {
    if (!open) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => setOpen(true)}
        disabled={factories.length === 0}
      >
        <BarChart3 className="h-4 w-4 mr-2" />
        Compare
      </Button>

      {mounted &&
        open &&
        createPortal(
          <div
            role="dialog"
            aria-labelledby="compare-title"
            className="z-[100] flex flex-col bg-background"
            style={FULLSCREEN_STYLE}
            onKeyDown={(e) => {
              if (e.key !== "Escape") return;
              const target = e.target;
              if (
                target instanceof HTMLInputElement ||
                target instanceof HTMLTextAreaElement ||
                target instanceof HTMLSelectElement
              ) {
                return;
              }
              close();
            }}
          >
            <header className="relative shrink-0 border-b px-6 py-4 pr-14">
              <h2
                id="compare-title"
                className="font-heading text-xl font-medium leading-none"
              >
                Compare quotes
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Factory prices side by side. Pick a winner and quantity per
                product.
              </p>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="absolute top-3 right-3"
                onClick={close}
                aria-label="Close"
              >
                <XIcon className="h-4 w-4" />
              </Button>
            </header>

            <div className="min-h-0 flex-1 overflow-auto px-6 py-4">
              {loading ? (
                <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading quotes…
                </div>
              ) : !hasQuotesState ? (
                <p className="text-sm text-muted-foreground">
                  No quotes yet. Factories must submit their prices first.
                </p>
              ) : (
                <ItemComparisonMatrix
                  key={`compare-${quotationId}`}
                  quotationId={quotationId}
                  quotationStatus={quotationStatus}
                  rows={rows}
                  factories={factories}
                />
              )}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
