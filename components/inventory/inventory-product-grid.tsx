"use client";

import { useTransition } from "react";
import Link from "next/link";
import type { InventoryProductWithHistory } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ItemPhotos } from "@/components/items/item-photos";
import { createQuotationFromInventory } from "@/app/admin/(dash)/inventory/actions";
import { ImageIcon, Loader2, ShoppingCart, History } from "lucide-react";

function fmt(n: number) {
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function latestPrice(product: InventoryProductWithHistory) {
  if (product.price_entries.length === 0) return null;
  return product.price_entries[0];
}

export function InventoryProductGrid({
  products,
}: {
  products: InventoryProductWithHistory[];
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {products.map((product) => (
        <InventoryProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}

function InventoryProductCard({
  product,
}: {
  product: InventoryProductWithHistory;
}) {
  const [pending, startTransition] = useTransition();
  const latest = latestPrice(product);

  function handleReorder() {
    startTransition(async () => {
      await createQuotationFromInventory(product.id);
    });
  }

  return (
    <Card className="p-4 flex flex-col gap-3 hover:border-foreground/20 hover:shadow-sm transition-all">
      <div className="flex gap-3">
        {product.photo_urls.length > 0 ? (
          <ItemPhotos urls={product.photo_urls} size="md" limit={1} />
        ) : (
          <div className="h-20 w-20 bg-muted rounded-md flex items-center justify-center shrink-0">
            <ImageIcon className="h-6 w-6 text-muted-foreground" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <Badge variant="secondary" className="text-[10px] mb-1.5 font-mono">
            {product.sku}
          </Badge>
          <h3 className="font-heading text-lg leading-tight truncate">
            {product.name || "(sin nombre)"}
          </h3>
          {latest && (
            <p className="text-sm text-muted-foreground mt-1 tabular-nums">
              Último precio:{" "}
              <span className="font-medium text-foreground">
                {fmt(Number(latest.unit_price))}
              </span>
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-0.5">
            {product.price_entries.length}{" "}
            {product.price_entries.length === 1 ? "pedido" : "pedidos"}
          </p>
        </div>
      </div>

      <div className="flex gap-2 mt-auto">
        <Button
          size="sm"
          className="flex-1"
          onClick={handleReorder}
          disabled={pending}
        >
          {pending ? (
            <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
          ) : (
            <ShoppingCart className="h-3.5 w-3.5 mr-1.5" />
          )}
          Nuevo pedido
        </Button>

        {product.price_entries.length > 0 && (
          <PriceHistoryDialog product={product} />
        )}
      </div>
    </Card>
  );
}

function PriceHistoryDialog({
  product,
}: {
  product: InventoryProductWithHistory;
}) {
  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button size="sm" variant="outline" aria-label="Ver historial de precios" />
        }
      >
        <History className="h-3.5 w-3.5" />
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Historial de precios</DialogTitle>
          <p className="text-sm text-muted-foreground font-mono">{product.sku}</p>
        </DialogHeader>
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {product.price_entries.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center justify-between gap-3 rounded-md border p-3 text-sm"
            >
              <div>
                <p className="font-medium tabular-nums">
                  {fmt(Number(entry.unit_price))}
                  <span className="text-muted-foreground font-normal">
                    {" "}
                    × {entry.quantity}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {new Date(entry.ordered_at).toLocaleDateString()}
                </p>
              </div>
              <Link
                href={`/admin/purchase-orders/${entry.purchase_order_id}`}
                className="text-sm text-primary hover:underline shrink-0"
              >
                Ver PO
              </Link>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
