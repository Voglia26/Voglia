import { redirect } from "next/navigation";
import { isAdmin, signOut } from "@/lib/auth";
import { Toaster } from "@/components/ui/sonner";
import { AdminShell } from "@/components/admin/admin-shell";

export default async function DashLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await isAdmin())) redirect("/login");

  async function logout() {
    "use server";
    await signOut();
    redirect("/login");
  }

  return (
    <>
      <AdminShell logoutAction={logout}>{children}</AdminShell>
      <Toaster />
    </>
  );
}
