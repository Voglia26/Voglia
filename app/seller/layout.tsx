import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession, signOut } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { VogliaLogo } from "@/components/brand/logo";

export default async function SellerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "seller" && session.role !== "admin") {
    redirect("/login");
  }

  async function logout() {
    "use server";
    await signOut();
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <Link href="/seller">
            <VogliaLogo width={180} height={51} className="h-10 w-auto" />
          </Link>
          <nav className="hidden sm:flex items-center gap-3 text-sm">
            <Link
              href="/seller"
              className="text-muted-foreground hover:text-foreground"
            >
              Mis pedidos
            </Link>
            <Link
              href="/seller/orders/new"
              className="text-muted-foreground hover:text-foreground"
            >
              Nuevo
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <p className="text-sm text-muted-foreground truncate max-w-[10rem]">
            {session.displayName}
          </p>
          <form action={logout}>
            <Button type="submit" variant="outline" size="sm">
              Sign out
            </Button>
          </form>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 animate-fade-up">
        {children}
      </main>
    </div>
  );
}
