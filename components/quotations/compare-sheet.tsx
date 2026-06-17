"use client";

import { useState } from "react";
import type { QuotationStatus } from "@/lib/types";
import type { ItemCompareRow } from "@/lib/quotation-compare";
import { ItemComparisonMatrix } from "@/components/quotations/item-comparison-matrix";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { BarChart3 } from "lucide-react";

type FactoryCol = { id: string; name: string };

export function CompareSheet({
  quotationId,
  quotationStatus,
  rows,
  factories,
  hasQuotes,
}: {
  quotationId: string;
  quotationStatus: QuotationStatus;
  rows: ItemCompareRow[];
  factories: FactoryCol[];
  hasQuotes: boolean;
}) {
  const [open, setOpen] = useState(false);

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

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-[min(96vw,1200px)] overflow-y-auto"
        >
          <SheetHeader className="pb-4 border-b mb-4">
            <SheetTitle className="font-heading text-2xl">Comparar cotizaciones</SheetTitle>
            <SheetDescription>
              Precios por fábrica lado a lado. Elegí el ganador y la cantidad por
              producto.
            </SheetDescription>
          </SheetHeader>

          {!hasQuotes ? (
            <p className="text-sm text-muted-foreground">
              Aún no hay cotizaciones. Las fábricas deben enviar sus precios
              primero.
            </p>
          ) : (
            <ItemComparisonMatrix
              quotationId={quotationId}
              quotationStatus={quotationStatus}
              rows={rows}
              factories={factories}
            />
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
