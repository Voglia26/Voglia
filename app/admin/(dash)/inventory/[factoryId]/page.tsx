import { notFound } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  Factory,
  InventoryPriceEntry,
  InventoryProduct,
} from "@/lib/types";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { InventoryProductGrid } from "@/components/inventory/inventory-product-grid";

export default async function FactoryInventoryPage({
  params,
}: {
  params: Promise<{ factoryId: string }>;
}) {
  const { factoryId } = await params;
  const supabase = createAdminClient();

  const { data: factory } = await supabase
    .from("factories")
    .select("*")
    .eq("id", factoryId)
    .maybeSingle();

  if (!factory) notFound();

  const { data: productsRaw } = await supabase
    .from("inventory_products")
    .select(
      "*, price_entries:inventory_price_entries(*, ordered_at)"
    )
    .eq("factory_id", factoryId)
    .order("updated_at", { ascending: false });

  const products = ((productsRaw ?? []) as (InventoryProduct & {
    price_entries: InventoryPriceEntry[];
  })[]).map((product) => ({
    ...product,
    price_entries: [...(product.price_entries ?? [])].sort(
      (a, b) =>
        new Date(b.ordered_at).getTime() - new Date(a.ordered_at).getTime()
    ),
  }));

  const typedFactory = factory as Factory;

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/admin/inventory"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          Diseños
        </Link>
      </div>

      <PageHeader
        eyebrow="Proveedor"
        title={typedFactory.name}
        description={`${products.length} ${
          products.length === 1 ? "diseño pedido" : "diseños pedidos"
        } a este proveedor.`}
      />

      {products.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Este proveedor aún no tiene diseños guardados.
        </p>
      ) : (
        <InventoryProductGrid products={products} />
      )}
    </div>
  );
}
