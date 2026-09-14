import { redirect } from "next/navigation";
import { getSession, signOut } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { VogliaLogo } from "@/components/brand/logo";

export default async function SellerHomePage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role === "admin") {
    // Admins can open /seller, but default home is admin panel
  }

  async function logout() {
    "use server";
    await signOut();
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b px-6 py-4 flex items-center justify-between gap-4">
        <VogliaLogo width={180} height={51} className="h-10 w-auto" />
        <div className="flex items-center gap-3">
          <p className="text-sm text-muted-foreground">
            {session.displayName}
          </p>
          <form action={logout}>
            <Button type="submit" variant="outline" size="sm">
              Sign out
            </Button>
          </form>
        </div>
      </header>
      <main className="max-w-lg mx-auto px-6 py-16 text-center animate-fade-up">
        <p className="eyebrow text-[10px] mb-3">Seller</p>
        <h1 className="font-heading text-3xl">Pedidos de clientas</h1>
        <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
          El módulo de pedidos de clientas se habilita en la próxima etapa.
          Tu cuenta ya está lista.
        </p>
      </main>
    </div>
  );
}
