import { notFound } from "next/navigation";
import Link from "next/link";
import { loadPurchaseOrderById } from "@/lib/po";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { ReorderForm } from "@/components/purchase-orders/reorder-form";

export default async function ReorderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const view = await loadPurchaseOrderById(id);
  if (!view) notFound();
  const { po, factory, quotation, items } = view;

  return (
    <div>
      <Link
        href={`/admin/purchase-orders/${id}`}
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to PO
      </Link>

      <PageHeader
        eyebrow="Reorder"
        title={factory.name}
        description={`Based on "${quotation.title}" — adjust specs and quantities, then confirm.`}
      />

      <ReorderForm
        originalPoId={po.id}
        items={items.map((pi) => ({
          item_id: pi.item.id,
          quote_id: pi.quote?.id ?? null,
          name: pi.item.name ?? "(untitled)",
          photo_url: pi.item.photo_url ?? null,
          quantity: pi.quantity,
          size: pi.size ?? "",
          gold_color: pi.gold_color ?? "",
          gemstone: pi.gemstone ?? "",
          other_comments: pi.other_comments ?? "",
        }))}
      />
    </div>
  );
}
