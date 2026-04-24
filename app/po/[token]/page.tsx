import { notFound } from "next/navigation";
import Image from "next/image";
import { loadPurchaseOrderByToken } from "@/lib/po";
import { QUOTE_COLUMNS, quoteTotal } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { ImageIcon } from "lucide-react";
import { VogliaLogo } from "@/components/brand/logo";
import { POStatusControl } from "@/components/public/po-status-control";

export default async function PublicPOPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const view = await loadPurchaseOrderByToken(token);
  if (!view) notFound();
  const { po, factory, quotation, items } = view;

  const grandTotal = items.reduce(
    (sum, i) => sum + quoteTotal(i.quote) * i.quantity,
    0
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <header className="mb-8 sm:mb-10 text-center border-b pb-10">
          <VogliaLogo
            width={450}
            height={112}
            className="h-24 sm:h-28 w-auto mx-auto mb-8 animate-fade-in"
          />
          <p className="eyebrow">Purchase order</p>
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl mt-4 text-balance">
            {factory.name}
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-4">
            From collection &quot;{quotation.title}&quot; · Issued{" "}
            {new Date(po.created_at).toLocaleDateString()}
          </p>
        </header>

        <POStatusControl token={po.token} status={po.status} />

        <div className="space-y-3 mb-6">
          {items.map((pi) => (
            <Card key={pi.id} className="p-4">
              <div className="flex gap-4">
                {pi.item.photo_url ? (
                  <Image
                    src={pi.item.photo_url}
                    alt=""
                    width={112}
                    height={112}
                    className="h-28 w-28 object-cover rounded shrink-0"
                    unoptimized
                  />
                ) : (
                  <div className="h-28 w-28 bg-muted rounded flex items-center justify-center shrink-0">
                    <ImageIcon className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-lg">
                        {pi.item.name || "(untitled)"}
                      </h3>
                      {pi.item.sku && (
                        <p className="text-xs text-muted-foreground">
                          SKU: {pi.item.sku}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Quantity</p>
                      <p className="text-2xl font-semibold">{pi.quantity}</p>
                    </div>
                  </div>
                  {pi.item.description && (
                    <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                      {pi.item.description}
                    </p>
                  )}
                  {pi.item.specs && <Specs specs={pi.item.specs} />}
                  <dl className="mt-3 grid grid-cols-3 gap-2 text-sm">
                    {QUOTE_COLUMNS.map((col) => (
                      <div key={col.key}>
                        <dt className="text-xs text-muted-foreground">
                          {col.label}
                        </dt>
                        <dd className="tabular-nums">
                          {pi.quote[col.key] !== null &&
                          pi.quote[col.key] !== undefined
                            ? Number(pi.quote[col.key]).toLocaleString()
                            : "—"}
                        </dd>
                      </div>
                    ))}
                  </dl>
                  <p className="mt-3 text-sm border-t pt-2 flex justify-between">
                    <span>Unit total: {quoteTotal(pi.quote).toLocaleString()}</span>
                    <span className="font-semibold">
                      Line total:{" "}
                      {(quoteTotal(pi.quote) * pi.quantity).toLocaleString()}
                    </span>
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <Card className="p-6 flex justify-between items-center bg-accent/40">
          <span className="eyebrow">Grand total</span>
          <span className="font-heading text-3xl md:text-4xl">
            {grandTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </span>
        </Card>

        <p className="eyebrow text-center mt-10 text-[10px]">
          Voglia Jewelry · Please confirm receipt with the client
        </p>
      </div>
    </div>
  );
}

function Specs({ specs }: { specs: Exclude<Parameters<typeof specsInner>[0], null | undefined> }) {
  return specsInner(specs);
}

function specsInner(
  specs: { weight_g?: number | null; carats?: number | null; gold_type?: string | null; stone_type?: string | null } | null | undefined
) {
  if (!specs) return null;
  const entries = [
    specs.weight_g !== null && specs.weight_g !== undefined ? `${specs.weight_g}g` : null,
    specs.carats ? `${specs.carats}ct` : null,
    specs.gold_type || null,
    specs.stone_type || null,
  ].filter(Boolean);
  if (entries.length === 0) return null;
  return <p className="text-xs text-muted-foreground mt-1">{entries.join(" · ")}</p>;
}
