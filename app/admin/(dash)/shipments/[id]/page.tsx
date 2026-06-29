import Link from "next/link";
import { notFound } from "next/navigation";
import { loadShipmentById } from "@/lib/shipments";
import { PageHeader } from "@/components/admin/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ItemPhotos } from "@/components/items/item-photos";
import { ShipmentStatusEditor } from "@/components/shipments/shipment-status-editor";
import { ExpectedDateEditor } from "@/components/shipments/expected-date-editor";
import {
  SHIPMENT_STATUS_LABELS,
  type ShipmentSource,
} from "@/lib/types";
import { ArrowLeft, ExternalLink, FileText } from "lucide-react";

const SOURCE_LABELS: Record<ShipmentSource, string> = {
  purchase_order: "Purchase order",
  manual: "Manual entry",
  import: "File import",
};

export default async function ShipmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const shipment = await loadShipmentById(id);
  if (!shipment) notFound();

  const isArchived = !!shipment.archived_at;
  const totalQty = shipment.items.reduce((s, i) => s + i.quantity, 0);

  return (
    <div>
      <Link
        href={isArchived ? "/admin/shipments?view=history" : "/admin/shipments"}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to shipments
      </Link>

      <PageHeader
        eyebrow="Shipment"
        title={shipment.factory.name}
        description={
          <>
            {SOURCE_LABELS[shipment.source]}
            {shipment.purchase_order && (
              <>
                {" · "}
                <Link
                  href={`/admin/purchase-orders/${shipment.purchase_order.id}`}
                  className="underline underline-offset-2 hover:text-foreground"
                >
                  View purchase order
                </Link>
              </>
            )}
          </>
        }
        actions={
          <Badge variant={isArchived ? "default" : "secondary"}>
            {SHIPMENT_STATUS_LABELS[shipment.status]}
            {isArchived ? " · Archived" : ""}
          </Badge>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <Card className="p-5 sm:p-6">
            <h2 className="font-heading text-lg mb-4">Products</h2>
            {shipment.items.length === 0 ? (
              <p className="text-sm text-muted-foreground">No products listed.</p>
            ) : (
              <ul className="divide-y">
                {shipment.items.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center gap-4 py-4 first:pt-0 last:pb-0"
                  >
                    <ItemPhotos
                      urls={item.photo_url ? [item.photo_url] : []}
                      size="md"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">
                        {item.name ?? "—"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        SKU {item.sku ?? "—"}
                      </p>
                    </div>
                    <p className="text-sm tabular-nums font-medium shrink-0">
                      × {item.quantity}
                    </p>
                  </li>
                ))}
              </ul>
            )}
            <p className="text-xs text-muted-foreground mt-4 pt-4 border-t tabular-nums">
              {shipment.items.length} product
              {shipment.items.length !== 1 ? "s" : ""} · total qty {totalQty}
            </p>
          </Card>

          {shipment.attachment_url && (
            <Card className="p-5 sm:p-6">
              <h2 className="font-heading text-lg mb-3">Attached document</h2>
              <a
                href={shipment.attachment_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm underline underline-offset-2"
              >
                <FileText className="h-4 w-4" />
                {shipment.attachment_name ?? "Download file"}
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </Card>
          )}

          {shipment.notes && (
            <Card className="p-5 sm:p-6">
              <h2 className="font-heading text-lg mb-2">Notes</h2>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {shipment.notes}
              </p>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card className="p-5 space-y-5">
            <div>
              <p className="eyebrow text-[10px] mb-1">Order date</p>
              <p className="text-sm tabular-nums">
                {new Date(shipment.order_date).toLocaleDateString(undefined, {
                  weekday: "short",
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>

            <ExpectedDateEditor
              shipmentId={shipment.id}
              current={shipment.expected_arrival_date}
            />

            {shipment.received_at && (
              <div>
                <p className="eyebrow text-[10px] mb-1">Received</p>
                <p className="text-sm tabular-nums">
                  {new Date(shipment.received_at).toLocaleDateString(undefined, {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </div>
            )}

            <ShipmentStatusEditor
              shipmentId={shipment.id}
              current={shipment.status}
            />
          </Card>
        </div>
      </div>
    </div>
  );
}
