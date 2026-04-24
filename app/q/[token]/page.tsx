import { notFound } from "next/navigation";
import Image from "next/image";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Item, Quote } from "@/lib/types";
import { FactoryForm } from "@/components/public/factory-form";
import { Card } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";
import { VogliaLogo } from "@/components/brand/logo";

export default async function FactoryQuotePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = createAdminClient();

  const { data: qf } = await supabase
    .from("quotation_factories")
    .select(
      "id, token, accepted_at, quotation:quotations(id, title), factory:factories(id, name)"
    )
    .eq("token", token)
    .maybeSingle();

  if (!qf) notFound();

  const quotation = Array.isArray(qf.quotation) ? qf.quotation[0] : qf.quotation;
  const factory = Array.isArray(qf.factory) ? qf.factory[0] : qf.factory;

  const { data: assignRows } = await supabase
    .from("item_assignments")
    .select("id, item:items(*), quote:quotes(*)")
    .eq("quotation_factory_id", qf.id);

  const rows = ((assignRows ?? []) as unknown as {
    id: string;
    item: Item | Item[];
    quote: Quote | Quote[] | null;
  }[]).map((r) => ({
    id: r.id,
    item: Array.isArray(r.item) ? r.item[0] : r.item,
    quote: Array.isArray(r.quote) ? r.quote[0] ?? null : r.quote,
  }));

  if (qf.accepted_at) {
    return (
      <SubmittedScreen
        factoryName={factory?.name ?? "Factory"}
        quotationTitle={quotation?.title ?? ""}
        rows={rows}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <header className="mb-10 sm:mb-14 text-center border-b pb-10">
          <VogliaLogo
            width={450}
            height={112}
            className="h-24 sm:h-28 w-auto mx-auto mb-8 animate-fade-in"
          />
          <p className="eyebrow">Quotation request</p>
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl mt-4 text-balance">
            {quotation?.title}
          </h1>
          <p className="text-muted-foreground mt-4 text-sm sm:text-base">
            For{" "}
            <span className="font-medium text-foreground">
              {factory?.name}
            </span>{" "}
            · Please quote the items below.
          </p>
        </header>

        <FactoryForm
          token={token}
          items={rows.map((r) => ({ assignmentId: r.id, item: r.item }))}
        />
      </div>
    </div>
  );
}

function SubmittedScreen({
  factoryName,
  quotationTitle,
  rows,
}: {
  factoryName: string;
  quotationTitle: string;
  rows: { id: string; item: Item; quote: Quote | null }[];
}) {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto py-10 px-4">
        <div className="flex justify-center mb-8">
          <VogliaLogo width={360} height={90} className="h-20 w-auto" />
        </div>
        <Card className="p-6 mb-6 border-green-600/30 bg-green-600/5">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-6 w-6 text-green-600" />
            <div>
              <h2 className="font-semibold">Quotation submitted</h2>
              <p className="text-sm text-muted-foreground">
                Thanks, {factoryName}. Your response has been recorded for
                &quot;{quotationTitle}&quot;. This link is now read-only.
              </p>
            </div>
          </div>
        </Card>

        <div className="space-y-3">
          {rows.map((r) => (
            <Card key={r.id} className="p-4">
              <div className="flex gap-4">
                {r.item.photo_url && (
                  <Image
                    src={r.item.photo_url}
                    alt=""
                    width={80}
                    height={80}
                    className="h-20 w-20 object-cover rounded shrink-0"
                    unoptimized
                  />
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium">{r.item.name || "(untitled)"}</h3>
                  {r.item.sku && (
                    <p className="text-xs text-muted-foreground">SKU: {r.item.sku}</p>
                  )}
                  {r.quote ? (
                    <dl className="mt-2 grid grid-cols-3 gap-2 text-xs">
                      <Field label="Gold loss" value={r.quote.gold_loss} />
                      <Field label="Total gold cost" value={r.quote.total_gold_cost} />
                      <Field label="Diamond cost" value={r.quote.diamond_cost} />
                      <Field label="Cost/carat" value={r.quote.cost_per_carat} />
                      <Field label="Labor" value={r.quote.labor} />
                      <Field label="Other fees" value={r.quote.other_fees} />
                    </dl>
                  ) : (
                    <p className="text-sm text-muted-foreground mt-2">Not quoted.</p>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: number | null }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value ?? "—"}</dd>
    </div>
  );
}
