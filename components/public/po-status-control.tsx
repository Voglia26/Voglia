"use client";

import { useState, useTransition } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  Factory,
  Package,
  Truck,
  Loader2,
  ArrowRight,
} from "lucide-react";
import {
  type PurchaseOrderStatus,
  PURCHASE_ORDER_STATUS_FLOW,
  PURCHASE_ORDER_STATUS_LABELS,
} from "@/lib/types";
import { advancePOStatus } from "@/app/po/[token]/actions";

const STATUS_ICON: Record<PurchaseOrderStatus, React.ReactNode> = {
  pending: <CheckCircle2 className="h-4 w-4" />,
  approved: <CheckCircle2 className="h-4 w-4" />,
  in_progress: <Factory className="h-4 w-4" />,
  sent: <Truck className="h-4 w-4" />,
  received: <Package className="h-4 w-4" />,
};

const NEXT_LABEL: Partial<
  Record<PurchaseOrderStatus, { next: PurchaseOrderStatus; label: string }>
> = {
  pending: { next: "approved", label: "Approve this order" },
  approved: { next: "in_progress", label: "Start production" },
  in_progress: { next: "sent", label: "Mark as shipped" },
};

export function POStatusControl({
  token,
  status,
}: {
  token: string;
  status: PurchaseOrderStatus;
}) {
  const [submitting, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  const nextStep = NEXT_LABEL[status];
  const currentIdx = PURCHASE_ORDER_STATUS_FLOW.indexOf(status);

  function advance() {
    if (!nextStep) return;
    setErr(null);
    startTransition(async () => {
      const res = await advancePOStatus(token, nextStep.next);
      if (!res.ok) setErr(res.error);
    });
  }

  return (
    <Card className="p-5 sm:p-6 mb-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
        <div>
          <p className="eyebrow">Current status</p>
          <div className="mt-1.5 flex items-center gap-2">
            {STATUS_ICON[status]}
            <span className="font-heading text-2xl">
              {PURCHASE_ORDER_STATUS_LABELS[status]}
            </span>
          </div>
        </div>
        {nextStep && (
          <Button
            onClick={advance}
            disabled={submitting}
            size="lg"
            className="eyebrow text-xs tracking-[0.2em] shrink-0"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <ArrowRight className="h-4 w-4 mr-2" />
            )}
            {nextStep.label}
          </Button>
        )}
      </div>

      <div className="flex items-center gap-1.5 overflow-x-auto">
        {PURCHASE_ORDER_STATUS_FLOW.map((step, idx) => {
          const active = idx <= currentIdx;
          return (
            <div key={step} className="flex items-center gap-1.5 shrink-0">
              <Badge
                variant={active ? "default" : "outline"}
                className={active ? "" : "text-muted-foreground"}
              >
                {PURCHASE_ORDER_STATUS_LABELS[step]}
              </Badge>
              {idx < PURCHASE_ORDER_STATUS_FLOW.length - 1 && (
                <span
                  className={`text-xs ${active ? "text-foreground" : "text-muted-foreground/50"}`}
                >
                  ›
                </span>
              )}
            </div>
          );
        })}
      </div>

      {err && (
        <p className="text-sm text-destructive mt-3" role="alert">
          {err}
        </p>
      )}
    </Card>
  );
}
