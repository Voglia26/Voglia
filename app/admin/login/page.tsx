import { redirect } from "next/navigation";
import { isAuthenticated, signIn } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { VogliaLogo } from "@/components/brand/logo";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; error?: string }>;
}) {
  if (await isAuthenticated()) redirect("/admin");
  const { from, error } = await searchParams;

  async function login(formData: FormData) {
    "use server";
    const password = String(formData.get("password") ?? "");
    const ok = await signIn(password);
    const target = (from && from.startsWith("/admin") ? from : "/admin") as `/admin${string}`;
    if (!ok) {
      redirect(
        `/admin/login?error=1${from ? `&from=${encodeURIComponent(from)}` : ""}` as `/admin/login?${string}`
      );
    }
    redirect(target);
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm animate-fade-up">
          <div className="flex flex-col items-center text-center">
            <VogliaLogo
              width={450}
              height={117}
              className="h-28 sm:h-32 w-auto"
            />
            <h1 className="font-display text-4xl sm:text-5xl mt-10">
              Welcome back
            </h1>
            <p className="text-sm text-muted-foreground mt-2">
              Sign in to manage quotations and purchase orders.
            </p>
          </div>

          <form action={login} className="mt-10 space-y-5">
            <div className="space-y-2">
              <Label
                htmlFor="password"
                className="eyebrow"
              >
                Password
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoFocus
                required
                aria-invalid={!!error}
                className="h-12 text-base"
              />
              {error && (
                <p className="text-sm text-destructive" role="alert">
                  Incorrect password. Please try again.
                </p>
              )}
            </div>
            <Button
              type="submit"
              className="w-full h-12 eyebrow text-xs tracking-[0.25em]"
            >
              Enter
            </Button>
          </form>
        </div>
      </main>

      <footer className="py-6 text-center">
        <p className="eyebrow text-[10px]">Voglia Jewelry · Internal</p>
      </footer>
    </div>
  );
}
