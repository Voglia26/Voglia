import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { createCustomerOrder } from "@/app/seller/actions";
import { CustomerOrderForm } from "@/components/customer-orders/order-form";
import { ArrowLeft } from "lucide-react";

export default async function NewCustomerOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await getSession();
  if (!session || session.role !== "seller") redirect("/login");

  const { error } = await searchParams;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/seller"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Mis pedidos
        </Link>
        <h1 className="font-heading text-3xl">Nuevo pedido</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Completa los datos de la clienta y el producto. El proveedor lo asigna
          el admin.
        </p>
      </div>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error === "missing"
            ? "Faltan campos obligatorios."
            : "No se pudo guardar. Intenta de nuevo."}
        </p>
      )}

      <CustomerOrderForm
        action={createCustomerOrder}
        submitLabel="Crear pedido"
        defaultOrderedAt={new Date().toISOString().slice(0, 10)}
      />
    </div>
  );
}
