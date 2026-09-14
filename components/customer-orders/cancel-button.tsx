"use client";

import { cancelCustomerOrder } from "@/app/seller/actions";
import { Button } from "@/components/ui/button";

export function CancelCustomerOrderButton({
  orderId,
  variant = "outline",
}: {
  orderId: string;
  variant?: "outline" | "destructive" | "ghost";
}) {
  return (
    <form
      action={cancelCustomerOrder}
      onSubmit={(e) => {
        if (
          !confirm(
            "¿Cancelar este pedido? Quedará en el historial pero no se podrá editar."
          )
        ) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={orderId} />
      <Button type="submit" variant={variant} size="sm">
        Cancelar pedido
      </Button>
    </form>
  );
}
