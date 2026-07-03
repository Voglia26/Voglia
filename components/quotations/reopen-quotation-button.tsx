"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { reopenQuotation } from "@/app/admin/(dash)/quotations/[id]/actions";
import { Button } from "@/components/ui/button";
import { Loader2, RotateCcw } from "lucide-react";

const CONFIRM_MESSAGE =
  "¿Reabrir esta cotización? Podrás volver a editar notas y generar nuevas órdenes de compra. Las POs ya existentes no se modifican.";

export function ReopenQuotationButton({
  quotationId,
  onReopened,
  variant = "outline",
  size = "default",
  className,
}: {
  quotationId: string;
  onReopened?: () => void;
  variant?: "outline" | "secondary" | "default";
  size?: "default" | "sm";
  className?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function handleClick() {
    if (!confirm(CONFIRM_MESSAGE)) return;
    setErr(null);
    startTransition(async () => {
      const res = await reopenQuotation(quotationId);
      if (!res.ok) {
        setErr(res.error);
        return;
      }
      onReopened?.();
      router.refresh();
    });
  }

  return (
    <div className={className}>
      <Button
        type="button"
        variant={variant}
        size={size}
        onClick={handleClick}
        disabled={pending}
      >
        {pending ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <RotateCcw className="h-4 w-4 mr-2" />
        )}
        Reabrir cotización
      </Button>
      {err && <p className="text-sm text-destructive mt-2">{err}</p>}
    </div>
  );
}
