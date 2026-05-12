export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { isAuthenticated, signOut } from "@/lib/auth";
import { Toaster } from "@/components/ui/sonner";
import { AdminShell } from "@/components/admin/admin-shell";

export default async function DashLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await isAuthenticated())) redirect("/admin/login");

  async function logout() {
    "use server";
    await signOut();
    redirect("/admin/login");
  }

  return (
    <>
      <AdminShell logoutAction={logout}>{children}</AdminShell>
      <Toaster />
    </>
  );
}
