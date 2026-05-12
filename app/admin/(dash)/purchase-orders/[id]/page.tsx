import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
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
import { ArrowLeft, Trash2, ImageIcon, RefreshCw } from "lucide-react";
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
    (sum, i) => sum + quoteTotal(i.quote ?? {}) * i.quantity,
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
            <Link href={`/admin/purchase-orders/${id}/reorder`}>
              <Button variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Reorder
              </Button>
            </Link>
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
              {pi.item.photo_url ? (
                <Image
                  src={pi.item.photo_url}
                  alt=""
                  width={96}
                  height={96}
                  className="h-24 w-24 object-cover rounded shrink-0"
                  unoptimized
                />
              ) : (
                <div className="h-24 w-24 bg-muted rounded flex items-center justify-center shrink-0">
                  <ImageIcon className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
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
                {(pi.size || pi.gold_color || pi.gemstone || pi.other_comments) && (
                  <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs border rounded-md p-2 bg-muted/30">
                    {pi.size && <><dt className="text-muted-foreground">Size</dt><dd className="font-medium">{pi.size}</dd></>}
                    {pi.gold_color && <><dt className="text-muted-foreground">Gold Color</dt><dd className="font-medium">{pi.gold_color}</dd></>}
                    {pi.gemstone && <><dt className="text-muted-foreground">Gemstone</dt><dd className="font-medium">{pi.gemstone}</dd></>}
                    {pi.other_comments && <><dt className="text-muted-foreground">Other comments</dt><dd className="font-medium">{pi.other_comments}</dd></>}
                  </dl>
                )}
                {pi.quote && (
                  <>
                    <dl className="mt-2 grid grid-cols-3 gap-2 text-xs">
                      {QUOTE_COLUMNS.map((col) => (
                        <div key={col.key}>
                          <dt className="text-muted-foreground">{col.label}</dt>
                          <dd className="tabular-nums">
                            {pi.quote![col.key] !== null &&
                            pi.quote![col.key] !== undefined
                              ? Number(pi.quote![col.key]).toLocaleString()
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
                  </>
                )}
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
