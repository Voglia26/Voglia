import { notFound } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Item, Factory, QuotationFactory, ItemAssignment, Quotation, Quote } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Trash2, Send, BarChart3 } from "lucide-react";
import { ItemsSection } from "@/components/quotations/items-section";
import { AssignmentMatrix } from "@/components/quotations/assignment-matrix";
import { ShareLinks } from "@/components/quotations/share-links";
import { sendQuotation, deleteQuotation } from "./actions";
import { PageHeader } from "@/components/admin/page-header";

export default async function QuotationEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createAdminClient();

  const [qRes, itemsRes, factoriesRes, qfRes] = await Promise.all([
    supabase.from("quotations").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("items")
      .select("*")
      .eq("quotation_id", id)
      .order("created_at", { ascending: true }),
    supabase.from("factories").select("*").order("name", { ascending: true }),
    supabase
      .from("quotation_factories")
      .select("*, item_assignments(*)")
      .eq("quotation_id", id),
  ]);

  const quotation = qRes.data as Quotation | null;
  if (!quotation) notFound();

  const items: Item[] = itemsRes.data ?? [];
  const factories: Factory[] = factoriesRes.data ?? [];
  const qfsRaw = (qfRes.data ?? []) as (QuotationFactory & {
    item_assignments: ItemAssignment[];
  })[];

  const qfByFactory = new Map<string, QuotationFactory>();
  const assignmentsByFactoryAndItem = new Map<string, Set<string>>();
  for (const qf of qfsRaw) {
    qfByFactory.set(qf.factory_id, qf);
    assignmentsByFactoryAndItem.set(
      qf.factory_id,
      new Set(qf.item_assignments.map((a) => a.item_id))
    );
  }

  const qfIds = qfsRaw.map((qf) => qf.id);
  let quotesByQfAndItem = new Map<string, Map<string, Quote>>();
  if (qfIds.length > 0) {
    const { data: assignRows } = await supabase
      .from("item_assignments")
      .select("id, quotation_factory_id, item_id, quotes(*)")
      .in("quotation_factory_id", qfIds);
    for (const row of (assignRows ?? []) as {
      quotation_factory_id: string;
      item_id: string;
      quotes: Quote | Quote[] | null;
    }[]) {
      const quote = Array.isArray(row.quotes) ? row.quotes[0] : row.quotes;
      if (!quote) continue;
      const inner =
        quotesByQfAndItem.get(row.quotation_factory_id) ?? new Map<string, Quote>();
      inner.set(row.item_id, quote);
      quotesByQfAndItem.set(row.quotation_factory_id, inner);
    }
  }

  const respondedCount = qfsRaw.filter((qf) => qf.accepted_at).length;
  const totalFactoriesInvolved = qfsRaw.length;

  const description = [
    `${items.length} item${items.length !== 1 ? "s" : ""}`,
    `${totalFactoriesInvolved} factor${totalFactoriesInvolved !== 1 ? "ies" : "y"} involved`,
    totalFactoriesInvolved > 0 ? `${respondedCount} responded` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div>
      <Link
        href="/admin/quotations"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        All quotations
      </Link>

      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-2">
            Quotation
            <Badge variant={quotation.status === "draft" ? "outline" : "secondary"}>
              {quotation.status}
            </Badge>
          </span>
        }
        title={quotation.title}
        description={description}
        actions={
          <>
            {respondedCount > 0 && (
              <Link href={`/admin/quotations/${id}/compare`}>
                <Button>
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Compare
                </Button>
              </Link>
            )}
            {quotation.status === "draft" && totalFactoriesInvolved > 0 && (
              <form action={sendQuotation}>
                <input type="hidden" name="id" value={id} />
                <Button type="submit">
                  <Send className="h-4 w-4 mr-2" />
                  Mark as sent
                </Button>
              </form>
            )}
            <form action={deleteQuotation}>
              <input type="hidden" name="id" value={id} />
              <Button
                type="submit"
                variant="ghost"
                size="icon"
                aria-label="Delete quotation"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </form>
          </>
        }
      />

      <section className="mb-12">
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="font-heading text-2xl">Items</h2>
          <p className="text-xs text-muted-foreground">
            {items.length} total
          </p>
        </div>
        <ItemsSection quotationId={id} items={items} />
      </section>

      <Separator className="my-10" />

      <section className="mb-12">
        <div className="mb-4">
          <h2 className="font-heading text-2xl">Factory assignments</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Check the factories that should quote each item.
          </p>
        </div>
        {factories.length === 0 ? (
          <p className="text-sm text-muted-foreground border rounded-md p-4">
            No factories yet.{" "}
            <Link href="/admin/factories" className="underline">
              Add factories first
            </Link>
            .
          </p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground border rounded-md p-4">
            Add items above before assigning factories.
          </p>
        ) : (
          <AssignmentMatrix
            quotationId={id}
            items={items}
            factories={factories}
            assignmentsByFactoryAndItem={Object.fromEntries(
              Array.from(assignmentsByFactoryAndItem.entries()).map(([k, v]) => [
                k,
                Array.from(v),
              ])
            )}
          />
        )}
      </section>

      {qfsRaw.length > 0 && (
        <>
          <Separator className="my-10" />
          <section>
            <div className="mb-4">
              <h2 className="font-heading text-2xl">Share links</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Copy each link and send it to the factory via WhatsApp.
              </p>
            </div>
            <ShareLinks
              quotationFactories={qfsRaw.map((qf) => ({
                id: qf.id,
                factory_id: qf.factory_id,
                factory_name:
                  factories.find((f) => f.id === qf.factory_id)?.name ?? "Factory",
                token: qf.token,
                accepted_at: qf.accepted_at,
                assigned_count: qf.item_assignments.length,
                quotes_count:
                  quotesByQfAndItem.get(qf.id)?.size ?? 0,
              }))}
            />
          </section>
        </>
      )}
    </div>
  );
}
