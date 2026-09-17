import Image from "next/image";
import { notFound } from "next/navigation";
import { loadCustomerPurchaseOrderByToken } from "@/lib/cpo";
import { VogliaLogo } from "@/components/brand/logo";
import { Card } from "@/components/ui/card";

function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-1">
        {label}
      </p>
      <p className="text-sm whitespace-pre-wrap">{value}</p>
    </div>
  );
}

export default async function PublicCustomerPOPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const view = await loadCustomerPurchaseOrderByToken(token);
  if (!view) notFound();

  const { cpo, factory, order } = view;

  const specs: { label: string; value: string }[] = [
    order.provider_sku?.trim()
      ? { label: "Provider SKU", value: order.provider_sku.trim() }
      : null,
    order.gold_color?.trim()
      ? { label: "Gold Color", value: order.gold_color.trim() }
      : null,
    order.diamond_shape?.trim()
      ? { label: "Diamond Shape", value: order.diamond_shape.trim() }
      : null,
    order.gemstone_type?.trim()
      ? { label: "Gemstone Type", value: order.gemstone_type.trim() }
      : null,
    order.size?.trim() ? { label: "Size", value: order.size.trim() } : null,
  ].filter((s): s is { label: string; value: string } => s !== null);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <header className="mb-8 sm:mb-10 text-center border-b pb-10">
          <VogliaLogo
            width={450}
            height={112}
            className="h-24 sm:h-28 w-auto mx-auto mb-8 animate-fade-in"
          />
          <p className="eyebrow">Purchase order</p>
          <h1 className="font-display text-4xl sm:text-5xl mt-4 text-balance">
            {factory.name}
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-4">
            Issued {new Date(cpo.created_at).toLocaleDateString("en-US")}
            {order.is_restock ? " · Restock" : ""}
          </p>
        </header>

        {order.is_restock && (
          <p className="mb-4 text-sm rounded-lg border border-amber-300/80 bg-amber-50 px-4 py-3 text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
            This order is marked as a restock.
          </p>
        )}

        <Card className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
            {order.photo_url ? (
              <Image
                src={order.photo_url}
                alt={order.customer_name}
                width={280}
                height={280}
                className="h-48 w-48 sm:h-56 sm:w-56 object-cover rounded-lg border shrink-0"
                unoptimized
              />
            ) : (
              <div className="h-48 w-48 sm:h-56 sm:w-56 rounded-lg border bg-muted flex items-center justify-center text-xs text-muted-foreground shrink-0">
                No photo
              </div>
            )}

            <div className="flex-1 min-w-0 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-heading text-2xl leading-tight">
                    Customer: {order.customer_name}
                  </h2>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">
                    Quantity
                  </p>
                  <p className="text-2xl font-semibold tabular-nums">
                    {cpo.quantity}
                  </p>
                </div>
              </div>

              {specs.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-md border bg-muted/40 px-3 py-3">
                  {specs.map((s) => (
                    <SpecRow key={s.label} label={s.label} value={s.value} />
                  ))}
                </div>
              )}

              {order.notes?.trim() && (
                <div className="rounded-md border bg-muted/40 px-3 py-2">
                  <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-1">
                    Notes
                  </p>
                  <p className="text-sm whitespace-pre-wrap">{order.notes}</p>
                </div>
              )}

              {order.due_date && (
                <p className="text-sm text-muted-foreground">
                  Due date: {order.due_date.slice(0, 10)}
                </p>
              )}

              {order.is_urgent && (
                <p className="text-sm font-medium text-destructive">Urgent</p>
              )}
            </div>
          </div>
        </Card>

        <p className="eyebrow text-center mt-10 text-[10px]">
          Voglia Jewelry · Please confirm with the client
        </p>
      </div>
    </div>
  );
}
