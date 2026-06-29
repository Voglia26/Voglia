import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadShipmentsList } from "@/lib/shipments";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { AddShipmentDialog } from "@/components/shipments/add-shipment-dialog";
import { ShipmentTabs } from "@/components/shipments/shipment-tabs";
import {
  SHIPMENT_STATUS_LABELS,
  type ShipmentStatus,
} from "@/lib/types";
import { ItemPhotos } from "@/components/items/item-photos";

export default async function ShipmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; factory_id?: string }>;
}) {
  const params = await searchParams;
  const view = params.view === "history" ? "history" : "active";
  const archived = view === "history";

  const supabase = createAdminClient();
  const [{ data: factoriesData }, rows] = await Promise.all([
    supabase.from("factories").select("id, name").order("name"),
    loadShipmentsList({
      archived,
      factoryId: params.factory_id,
    }),
  ]);

  const factories = factoriesData ?? [];

  return (
    <div>
      <PageHeader
        eyebrow="Logistics"
        title="Shipments"
        description={
          archived
            ? "Received shipments archived for reference."
            : "Track incoming orders from factories."
        }
        actions={<AddShipmentDialog factories={factories} />}
      />

      <ShipmentTabs
        currentView={view}
        factories={factories}
        factoryId={params.factory_id}
      />

      {rows.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground border-dashed">
          <p className="font-heading text-xl mb-2">
            {archived ? "No shipment history" : "No active shipments"}
          </p>
          <p className="text-sm">
            {archived
              ? "Received shipments will appear here."
              : "Shipments are created automatically when you generate purchase orders."}
          </p>
        </Card>
      ) : (
        <div className="grid gap-2">
          {rows.map((sh) => {
            const totalQty = sh.items.reduce((s, i) => s + i.quantity, 0);
            const previewPhotos = sh.items
              .map((i) => i.photo_url)
              .filter(Boolean) as string[];

            return (
              <Link
                key={sh.id}
                href={`/admin/shipments/${sh.id}`}
                className="block group"
              >
                <Card className="p-4 sm:p-5 hover:border-foreground/20 hover:shadow-sm transition-all">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="font-heading text-xl truncate">
                          {sh.factory?.name ?? "—"}
                        </h3>
                        <StatusBadge status={sh.status} archived={!!sh.archived_at} />
                        {sh.source !== "purchase_order" && (
                          <Badge variant="outline" className="text-[10px]">
                            {sh.source === "import" ? "Import" : "Manual"}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
                        <span>
                          Ordered{" "}
                          {new Date(sh.order_date).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                        {sh.expected_arrival_date && (
                          <span>
                            ETA{" "}
                            {new Date(
                              sh.expected_arrival_date
                            ).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </span>
                        )}
                        <span className="tabular-nums">
                          {sh.items.length} product
                          {sh.items.length !== 1 ? "s" : ""} · qty {totalQty}
                        </span>
                      </p>
                      {previewPhotos.length > 0 && (
                        <div className="mt-3 flex gap-1">
                          <ItemPhotos
                            urls={previewPhotos.slice(0, 4)}
                            size="sm"
                            limit={4}
                          />
                        </div>
                      )}
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatusBadge({
  status,
  archived,
}: {
  status: ShipmentStatus;
  archived: boolean;
}) {
  const variant =
    status === "received" || archived
      ? "default"
      : status === "in_customs"
        ? "secondary"
        : status === "in_transit"
          ? "secondary"
          : "outline";
  return (
    <Badge variant={variant}>{SHIPMENT_STATUS_LABELS[status]}</Badge>
  );
}
