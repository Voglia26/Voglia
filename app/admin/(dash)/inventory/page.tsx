import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/admin/page-header";
import { Factory } from "lucide-react";

type FactoryWithCount = {
  id: string;
  name: string;
  product_count: number;
};

export default async function InventoryPage() {
  const supabase = createAdminClient();

  const { data: products } = await supabase
    .from("inventory_products")
    .select("factory_id, factory:factories(id, name)");

  const countByFactory = new Map<string, { id: string; name: string; count: number }>();

  for (const row of products ?? []) {
    const factory = Array.isArray(row.factory) ? row.factory[0] : row.factory;
    if (!factory) continue;
    const existing = countByFactory.get(factory.id);
    if (existing) {
      existing.count += 1;
    } else {
      countByFactory.set(factory.id, {
        id: factory.id,
        name: factory.name,
        count: 1,
      });
    }
  }

  const factories: FactoryWithCount[] = [...countByFactory.values()]
    .map((f) => ({
      id: f.id,
      name: f.name,
      product_count: f.count,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div>
      <PageHeader
        eyebrow="Catálogo"
        title="Diseños"
        description="Diseños pedidos a cada proveedor, con fotos, SKU y precios históricos."
      />

      {factories.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground border-dashed">
          <p className="font-heading text-xl mb-2">Sin diseños guardados</p>
          <p className="text-sm max-w-md mx-auto">
            Cuando cierres una cotización y generes órdenes de compra, los
            diseños ganadores se guardarán aquí automáticamente por proveedor.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {factories.map((factory) => (
            <Link key={factory.id} href={`/admin/inventory/${factory.id}`}>
              <Card className="p-5 hover:border-foreground/20 hover:shadow-sm transition-all h-full">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center shrink-0">
                    <Factory className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-heading text-xl truncate">
                      {factory.name}
                    </h3>
                    <Badge variant="secondary" className="mt-2">
                      {factory.product_count}{" "}
                      {factory.product_count === 1 ? "diseño" : "diseños"}
                    </Badge>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
