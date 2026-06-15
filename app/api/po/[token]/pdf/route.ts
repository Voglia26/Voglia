import { NextResponse } from "next/server";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image as PdfImage,
  renderToBuffer,
} from "@react-pdf/renderer";
import React from "react";
import { loadPurchaseOrderByToken } from "@/lib/po";
import { QUOTE_COLUMNS, quoteTotal } from "@/lib/types";

export const runtime = "nodejs";

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 10, fontFamily: "Helvetica", color: "#111" },
  header: { marginBottom: 20, borderBottom: "1 solid #ddd", paddingBottom: 12 },
  label: { fontSize: 8, textTransform: "uppercase", color: "#666", letterSpacing: 1 },
  factory: { fontSize: 20, fontWeight: 700, marginTop: 4 },
  meta: { marginTop: 4, color: "#555", fontSize: 9 },
  item: {
    flexDirection: "row",
    gap: 12,
    padding: 10,
    border: "1 solid #e5e5e5",
    borderRadius: 4,
    marginBottom: 8,
  },
  photo: { width: 80, height: 80, objectFit: "cover", borderRadius: 3 },
  photoPlaceholder: {
    width: 80,
    height: 80,
    backgroundColor: "#f4f4f5",
    borderRadius: 3,
  },
  itemBody: { flex: 1 },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  itemName: { fontSize: 12, fontWeight: 700 },
  variantLabel: { fontSize: 10, fontWeight: 600, marginTop: 2 },
  variantDesc: { color: "#666", fontSize: 8, marginTop: 1 },
  qty: { fontSize: 14, fontWeight: 700 },
  sku: { color: "#666", fontSize: 8 },
  specs: { color: "#555", fontSize: 9, marginTop: 2 },
  columnsRow: { flexDirection: "row", flexWrap: "wrap", marginTop: 6 },
  col: { width: "33.33%", marginBottom: 4 },
  colLabel: { color: "#777", fontSize: 8 },
  colValue: { fontSize: 10 },
  totals: {
    marginTop: 4,
    borderTop: "1 solid #eee",
    paddingTop: 4,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  grandTotal: {
    marginTop: 20,
    padding: 12,
    backgroundColor: "#f9f9f9",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderRadius: 4,
  },
  grandTotalLabel: { color: "#555" },
  grandTotalValue: { fontSize: 16, fontWeight: 700 },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 36,
    right: 36,
    textAlign: "center",
    color: "#999",
    fontSize: 8,
  },
});

function formatSpecs(
  specs: { weight_g?: number | null; carats?: number | null; gold_type?: string | null; stone_type?: string | null } | null | undefined
) {
  if (!specs) return "";
  const parts = [
    specs.weight_g !== null && specs.weight_g !== undefined ? `${specs.weight_g}g` : null,
    specs.carats ? `${specs.carats}ct` : null,
    specs.gold_type || null,
    specs.stone_type || null,
  ].filter(Boolean);
  return parts.join(" · ");
}

function fmt(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return Number(n).toLocaleString();
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const view = await loadPurchaseOrderByToken(token);
  if (!view) return new NextResponse("Not found", { status: 404 });

  const { po, factory, quotation, items } = view;
  const grandTotal = items.reduce(
    (sum, i) => sum + quoteTotal(i.quote) * i.quantity,
    0
  );

  const doc = React.createElement(
    Document,
    {},
    React.createElement(
      Page,
      { size: "A4", style: styles.page },
      React.createElement(
        View,
        { style: styles.header },
        React.createElement(Text, { style: styles.label }, "Purchase order"),
        React.createElement(Text, { style: styles.factory }, factory.name),
        React.createElement(
          Text,
          { style: styles.meta },
          `From collection "${quotation.title}" · Issued ${new Date(po.created_at).toLocaleDateString()}`
        )
      ),
      ...items.map((pi) => {
        const specs = formatSpecs(pi.item.specs);
        return React.createElement(
          View,
          { key: pi.id, style: styles.item, wrap: false },
          pi.item.photo_urls[0]
            ? React.createElement(PdfImage, {
                src: pi.item.photo_urls[0],
                style: styles.photo,
              })
            : React.createElement(View, { style: styles.photoPlaceholder }),
          React.createElement(
            View,
            { style: styles.itemBody },
            React.createElement(
              View,
              { style: styles.itemHeader },
              React.createElement(
                View,
                {},
                React.createElement(
                  Text,
                  { style: styles.itemName },
                  pi.item.name || "(untitled)"
                ),
                pi.variant
                  ? React.createElement(
                      Text,
                      { style: styles.variantLabel },
                      `Variant: ${pi.variant.label}`
                    )
                  : null,
                pi.variant?.description
                  ? React.createElement(
                      Text,
                      { style: styles.variantDesc },
                      pi.variant.description
                    )
                  : null,
                pi.item.sku
                  ? React.createElement(Text, { style: styles.sku }, `SKU: ${pi.item.sku}`)
                  : null
              ),
              React.createElement(Text, { style: styles.qty }, `× ${pi.quantity}`)
            ),
            specs ? React.createElement(Text, { style: styles.specs }, specs) : null,
            pi.item.description
              ? React.createElement(Text, { style: styles.specs }, pi.item.description)
              : null,
            React.createElement(
              View,
              { style: styles.columnsRow },
              ...QUOTE_COLUMNS.map((col) =>
                React.createElement(
                  View,
                  { key: col.key, style: styles.col },
                  React.createElement(Text, { style: styles.colLabel }, col.label),
                  React.createElement(Text, { style: styles.colValue }, fmt(pi.quote[col.key]))
                )
              )
            ),
            React.createElement(
              View,
              { style: styles.totals },
              React.createElement(
                Text,
                {},
                `Unit total: ${fmt(quoteTotal(pi.quote))}`
              ),
              React.createElement(
                Text,
                { style: { fontWeight: 700 } },
                `Line total: ${fmt(quoteTotal(pi.quote) * pi.quantity)}`
              )
            )
          )
        );
      }),
      React.createElement(
        View,
        { style: styles.grandTotal },
        React.createElement(Text, { style: styles.grandTotalLabel }, "Grand total"),
        React.createElement(
          Text,
          { style: styles.grandTotalValue },
          grandTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })
        )
      ),
      React.createElement(
        Text,
        { style: styles.footer, fixed: true },
        `PO ${po.id.slice(0, 8)} · ${factory.name}`
      )
    )
  );

  const buffer = await renderToBuffer(doc);
  const bytes = new Uint8Array(buffer);
  return new NextResponse(bytes, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="PO-${factory.name.replace(/[^a-z0-9]+/gi, "-")}-${po.id.slice(0, 8)}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
