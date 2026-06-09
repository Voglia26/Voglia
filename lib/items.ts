import type { Item, ItemSpecs } from "@/lib/types";

type RawItem = Partial<Item> & { photo_url?: string | null };

/** Normalizes DB rows (supports legacy `photo_url` column). */
export function normalizeItem(raw: RawItem): Item {
  const photo_urls =
    Array.isArray(raw.photo_urls) && raw.photo_urls.length > 0
      ? raw.photo_urls.filter(Boolean)
      : raw.photo_url
        ? [raw.photo_url]
        : [];

  return {
    id: raw.id!,
    quotation_id: raw.quotation_id!,
    name: raw.name ?? null,
    sku: raw.sku ?? null,
    description: raw.description ?? null,
    specs: (raw.specs as ItemSpecs) ?? null,
    photo_urls,
    position: raw.position ?? 0,
    created_at: raw.created_at!,
  };
}
