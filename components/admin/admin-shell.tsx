"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { LayoutDashboard, Factory, FileText, ClipboardList, LogOut, Menu, Archive } from "lucide-react";
import { VogliaLogo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/factories", label: "Factories", icon: Factory },
  { href: "/admin/quotations", label: "Quotations", icon: FileText },
  { href: "/admin/purchase-orders", label: "Purchase orders", icon: ClipboardList },
  { href: "/admin/inventory", label: "Designs", icon: Archive },
];

export function AdminShell({
  children,
  logoutAction,
}: {
  children: React.ReactNode;
  logoutAction: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-72 shrink-0 border-r bg-sidebar px-6 py-8 flex-col">
        <SidebarContent logoutAction={logoutAction} />
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 inset-x-0 z-40 bg-sidebar/95 backdrop-blur-md border-b flex items-center justify-between px-4 h-20">
        <Link href="/admin">
          <VogliaLogo width={250} height={63} className="h-14 w-auto" />
        </Link>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger
            render={
              <Button variant="ghost" size="icon" aria-label="Open menu" />
            }
          >
            <Menu className="h-5 w-5" />
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0">
            <SheetHeader className="sr-only">
              <SheetTitle>Navigation</SheetTitle>
            </SheetHeader>
            <div className="flex flex-col h-full px-6 py-8">
              <SidebarContent
                logoutAction={logoutAction}
                onNavigate={() => setOpen(false)}
              />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <main className="flex-1 w-full min-w-0 pt-20 md:pt-0">
        <div className="px-4 sm:px-6 md:px-10 py-6 md:py-10 max-w-6xl mx-auto animate-fade-up">
          {children}
        </div>
      </main>
    </div>
  );
}

function SidebarContent({
  logoutAction,
  onNavigate,
}: {
  logoutAction: () => Promise<void>;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <>
      <Link href="/admin" className="block" onClick={onNavigate}>
        <VogliaLogo width={315} height={81} className="h-20 w-auto" />
      </Link>
      <p className="eyebrow mt-4">Quotations · Orders</p>

      <nav className="mt-10 space-y-1 flex-1">
        {NAV.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-3 text-[15px] transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <Separator className="my-4" />
      <form action={logoutAction}>
        <Button
          variant="ghost"
          size="sm"
          type="submit"
          className="w-full justify-start text-muted-foreground hover:text-foreground"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sign out
        </Button>
      </form>
    </>
  );
}
