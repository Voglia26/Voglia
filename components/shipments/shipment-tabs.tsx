"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

export function ShipmentTabs({
  currentView,
  factories,
  factoryId,
}: {
  currentView: "active" | "history";
  factories: { id: string; name: string }[];
  factoryId?: string;
}) {
  const router = useRouter();

  function buildUrl(view: string, factory?: string) {
    const p = new URLSearchParams();
    if (view === "history") p.set("view", "history");
    if (factory) p.set("factory_id", factory);
    const q = p.toString();
    return q ? `/admin/shipments?${q}` : "/admin/shipments";
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
      <div className="inline-flex rounded-lg border border-input p-0.5 bg-muted/30">
        <Link
          href={buildUrl("active", factoryId)}
          className={cn(
            "rounded-md px-4 py-2 text-sm font-medium transition-colors",
            currentView === "active"
              ? "bg-background shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Active
        </Link>
        <Link
          href={buildUrl("history", factoryId)}
          className={cn(
            "rounded-md px-4 py-2 text-sm font-medium transition-colors",
            currentView === "history"
              ? "bg-background shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          History
        </Link>
      </div>

      <select
        value={factoryId ?? ""}
        onChange={(e) =>
          router.push(
            buildUrl(currentView, e.target.value || undefined)
          )
        }
        className="h-9 rounded-lg border border-input bg-background px-3 text-sm sm:ml-auto sm:max-w-[220px]"
      >
        <option value="">All factories</option>
        {factories.map((f) => (
          <option key={f.id} value={f.id}>
            {f.name}
          </option>
        ))}
      </select>
    </div>
  );
}
