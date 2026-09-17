import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/admin/page-header";
import {
  SellersAdmin,
  type SellerRow,
} from "@/components/sellers/sellers-admin";
import { Card } from "@/components/ui/card";

export default async function AdminSellersPage() {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("app_users")
    .select("id, username, display_name, active, created_at")
    .eq("role", "seller")
    .order("display_name", { ascending: true });

  const sellers = (data ?? []) as SellerRow[];

  return (
    <div>
      <PageHeader
        eyebrow="Acceso"
        title="Vendedoras"
        description="Creá usuarios, reseteá contraseñas y activá o desactivá el acceso. Los pedidos de vendedoras desactivadas se conservan."
      />

      {sellers.length === 0 ? (
        <div className="space-y-4">
          <SellersAdmin sellers={[]} />
          <Card className="p-12 text-center text-muted-foreground border-dashed">
            <p className="font-heading text-xl mb-2">Sin vendedoras</p>
            <p className="text-sm">
              Creá la primera para que puedan cargar pedidos.
            </p>
          </Card>
        </div>
      ) : (
        <SellersAdmin sellers={sellers} />
      )}
    </div>
  );
}
