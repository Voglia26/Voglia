"use client";

import { useTransition } from "react";
import { cancelCustomerOrder } from "@/app/seller/actions";
import { Button } from "@/components/ui/button";

export function CancelCustomerOrderButton({
  orderId,
  variant = "outline",
}: {
  orderId: string;
  variant?: "outline" | "destructive" | "ghost";
}) {
  const [pending, startTransition] = useTransition();

  function handleCancel() {
    if (
      !confirm(
        "¿Cancelar este pedido? Quedará en el historial pero no se podrá editar."
      )
    ) {
      return;
    }
    const fd = new FormData();
    fd.set("id", orderId);
    startTransition(async () => {
      await cancelCustomerOrder(fd);
    });
  }

  return (
    <Button
      type="button"
      variant={variant}
      size="sm"
      disabled={pending}
      onClick={handleCancel}
    >
      {pending ? "Cancelando…" : "Cancelar pedido"}
    </Button>
  );
}
