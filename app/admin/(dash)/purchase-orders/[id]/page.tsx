import { notFound } from "next/navigation";
import Link from "next/link";
import { loadPurchaseOrderById } from "@/lib/po";
import {
  QUOTE_COLUMNS,
  quoteTotal,
  PURCHASE_ORDER_STATUS_LABELS,
} from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Trash2 } from "lucide-react";
import { ItemPhotos } from "@/components/items/item-photos";
import { CopyPublicLink } from "@/components/purchase-orders/copy-public-link";
import { POStatusEditor } from "@/components/purchase-orders/status-editor";
import { PageHeader } from "@/components/admin/page-header";
import { deletePurchaseOrder } from "./actions";

export default async function PurchaseOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const view = await loadPurchaseOrderById(id);
  if (!view) notFound();
  const { po, factory, quotation, items } = view;

  const grandTotal = items.reduce(
    (sum, i) => sum + quoteTotal(i.quote) * i.quantity,
    0
  );

  const metaLine = [
    `From "${quotation.title}"`,
    `Created ${new Date(po.created_at).toLocaleDateString()}`,
    po.received_at
      ? `Received ${new Date(po.received_at).toLocaleDateString()}`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div>
      <Link
        href="/admin/purchase-orders"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        All purchase orders
      </Link>

      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-2">
            Purchase order
            <Badge variant={po.status === "received" ? "default" : "secondary"}>
              {PURCHASE_ORDER_STATUS_LABELS[po.status]}
            </Badge>
          </span>
        }
        title={factory.name}
        description={metaLine}
        actions={
          <>
            <POStatusEditor poId={po.id} current={po.status} />
            <form action={deletePurchaseOrder}>
              <input type="hidden" name="id" value={po.id} />
              <Button
                type="submit"
                variant="ghost"
                size="icon"
                aria-label="Delete PO"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </form>
          </>
        }
      />

      <CopyPublicLink token={po.token} />

      <Separator className="my-6" />

      <div className="space-y-3">
        {items.map((pi) => (
          <Card key={pi.id} className="p-4">
            <div className="flex gap-4">
              <ItemPhotos urls={pi.item.photo_urls} size="md" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-medium">
                    {pi.item.name || "(untitled)"}
                  </h3>
                  <span className="text-sm">
                    Qty <span className="font-semibold">{pi.quantity}</span>
                  </span>
                </div>
                {pi.item.sku && (
                  <p className="text-xs text-muted-foreground">SKU: {pi.item.sku}</p>
                )}
                <dl className="mt-2 grid grid-cols-3 gap-2 text-xs">
                  {QUOTE_COLUMNS.map((col) => (
                    <div key={col.key}>
                      <dt className="text-muted-foreground">{col.label}</dt>
                      <dd className="tabular-nums">
                        {pi.quote[col.key] !== null &&
                        pi.quote[col.key] !== undefined
                          ? Number(pi.quote[col.key]).toLocaleString()
                          : "—"}
                      </dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-2 text-sm">
                  Unit total:{" "}
                  <span className="font-medium">
                    {quoteTotal(pi.quote).toLocaleString()}
                  </span>{" "}
                  · Line total:{" "}
                  <span className="font-semibold">
                    {(quoteTotal(pi.quote) * pi.quantity).toLocaleString()}
                  </span>
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="mt-6 p-6 flex items-center justify-between bg-accent/40">
        <span className="eyebrow">Grand total</span>
        <span className="font-heading text-3xl md:text-4xl">
          {grandTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}
        </span>
      </Card>
    </div>
  );
}
