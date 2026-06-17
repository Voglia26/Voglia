import { notFound } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadQuotationCompareData, hasAnyQuotes } from "@/lib/quotation-compare";
import type { Item, ItemWithVariants, Factory, QuotationFactory, ItemAssignment, Quotation, ItemVariant } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Trash2, Send } from "lucide-react";
import { ItemsSection } from "@/components/quotations/items-section";
import { AssignmentMatrix } from "@/components/quotations/assignment-matrix";
import { ShareLinks } from "@/components/quotations/share-links";
import { CompareSheet } from "@/components/quotations/compare-sheet";
import { sendQuotation, deleteQuotation } from "./actions";
import { PageHeader } from "@/components/admin/page-header";

export default async function QuotationEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createAdminClient();

  const [qRes, itemsRes, factoriesRes, qfRes, compareData] = await Promise.all([
    supabase.from("quotations").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("items")
      .select("*, item_variants(*)")
      .eq("quotation_id", id)
      .order("created_at", { ascending: true }),
    supabase.from("factories").select("*").order("name", { ascending: true }),
    supabase
      .from("quotation_factories")
      .select("*, item_assignments(*)")
      .eq("quotation_id", id),
    loadQuotationCompareData(supabase, id),
  ]);

  const quotation = qRes.data as Quotation | null;
  if (!quotation) notFound();

  const items: ItemWithVariants[] = (itemsRes.data ?? []).map((raw) => {
    const row = raw as Item & { item_variants: ItemVariant[] | null };
    const reference_variants = (row.item_variants ?? [])
      .filter((v) => v.item_id && !v.item_assignment_id)
      .sort((a, b) => a.position - b.position);
    return { ...row, reference_variants };
  });
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
  let quotesByQf = new Map<string, number>();
  if (qfIds.length > 0) {
    const { data: assignRows } = await supabase
      .from("item_assignments")
      .select("id, quotation_factory_id, quotes(id)")
      .in("quotation_factory_id", qfIds);
    for (const row of assignRows ?? []) {
      const quotes = row.quotes;
      const list = Array.isArray(quotes) ? quotes : quotes ? [quotes] : [];
      if (list.length === 0) continue;
      quotesByQf.set(
        row.quotation_factory_id,
        (quotesByQf.get(row.quotation_factory_id) ?? 0) + list.length
      );
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
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-baseline gap-3">
            <h2 className="font-heading text-2xl">Items</h2>
            <p className="text-xs text-muted-foreground">
              {items.length} total
            </p>
          </div>
          {compareData && (
            <CompareSheet
              quotationId={id}
              quotationStatus={quotation.status}
              rows={compareData.rows}
              factories={compareData.factories.map((f) => ({
                id: f.id,
                name: f.name,
              }))}
              hasQuotes={hasAnyQuotes(compareData.rows)}
            />
          )}
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
                quotes_count: quotesByQf.get(qf.id) ?? 0,
              }))}
            />
          </section>
        </>
      )}
    </div>
  );
}
