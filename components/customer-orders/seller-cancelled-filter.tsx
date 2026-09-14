"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

export function SellerCancelledFilter() {
  const searchParams = useSearchParams();
  const cancelled = searchParams.get("cancelled");
  const hide = cancelled === "hide";

  const href = hide ? "/seller" : "/seller?cancelled=hide";

  return (
    <Link
      href={href}
      className={cn(
        "text-sm underline-offset-4 hover:underline",
        hide ? "text-foreground font-medium" : "text-muted-foreground"
      )}
    >
      {hide ? "Mostrar cancelados" : "Ocultar cancelados"}
    </Link>
  );
}
