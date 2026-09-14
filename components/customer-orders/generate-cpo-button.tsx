"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { generateCustomerPurchaseOrder } from "@/app/admin/(dash)/customer-orders/actions";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export function GenerateCpoButton({
  orderId,
  isRestock,
  size = "sm",
}: {
  orderId: string;
  isRestock?: boolean;
  size?: "sm" | "default";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    setError(null);
    if (
      isRestock &&
      !confirm(
        "Este pedido es una REPOSICIÓN (no se cobra a la fábrica). ¿Generar Purchase Order de todos modos?"
      )
    ) {
      return;
    }

    startTransition(async () => {
      const res = await generateCustomerPurchaseOrder(orderId);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-1">
      <Button
        type="button"
        size={size}
        variant={isRestock ? "outline" : "default"}
        disabled={pending}
        onClick={handleClick}
      >
        {pending && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
        Generate PO
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
