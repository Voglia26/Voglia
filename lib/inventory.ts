import type { SupabaseClient } from "@supabase/supabase-js";
import type { Item, Quote } from "@/lib/types";
import { quoteTotal } from "@/lib/types";

export type InventoryAward = {
  item_id: string;
  factory_id: string;
  quote_id: string;
  quantity: number;
  purchase_order_id: string;
};

function resolveSku(item: Item): string {
  const trimmed = item.sku?.trim();
  if (trimmed) return trimmed;
  return `VL-${item.id.slice(0, 8).toUpperCase()}`;
}

export async function syncInventoryFromAwards(
  supabase: SupabaseClient,
  quotation_id: string,
  awards: InventoryAward[]
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (awards.length === 0) return { ok: true };

  const itemIds = [...new Set(awards.map((a) => a.item_id))];
  const quoteIds = [...new Set(awards.map((a) => a.quote_id))];

  const [itemsRes, quotesRes] = await Promise.all([
    supabase.from("items").select("*").in("id", itemIds),
    supabase.from("quotes").select("*").in("id", quoteIds),
  ]);

  if (itemsRes.error) return { ok: false, error: itemsRes.error.message };
  if (quotesRes.error) return { ok: false, error: quotesRes.error.message };

  const itemMap = new Map(
    ((itemsRes.data ?? []) as Item[]).map((item) => [item.id, item])
  );
  const quoteMap = new Map(
    ((quotesRes.data ?? []) as Quote[]).map((quote) => [quote.id, quote])
  );

  for (const award of awards) {
    const item = itemMap.get(award.item_id);
    const quote = quoteMap.get(award.quote_id);
    if (!item || !quote) continue;

    const sku = resolveSku(item);
    const now = new Date().toISOString();

    const { data: product, error: productErr } = await supabase
      .from("inventory_products")
      .upsert(
        {
          factory_id: award.factory_id,
          sku,
          name: item.name,
          description: item.description,
          specs: item.specs,
          photo_urls: item.photo_urls ?? [],
          updated_at: now,
        },
        { onConflict: "factory_id,sku" }
      )
      .select("id")
      .single();

    if (productErr || !product) {
      return {
        ok: false,
        error: productErr?.message ?? "No se pudo guardar el diseño",
      };
    }

    const { error: priceErr } = await supabase
      .from("inventory_price_entries")
      .insert({
        inventory_product_id: product.id,
        quotation_id,
        purchase_order_id: award.purchase_order_id,
        unit_price: quoteTotal(quote),
        quantity: award.quantity,
        quote_snapshot: quote,
      });

    if (priceErr) return { ok: false, error: priceErr.message };
  }

  return { ok: true };
}
