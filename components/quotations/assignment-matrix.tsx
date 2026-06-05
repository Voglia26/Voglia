"use client";

import { useState, useTransition } from "react";
import { ItemPhotos } from "@/components/items/item-photos";
import type { Item, Factory } from "@/lib/types";
import { Checkbox } from "@/components/ui/checkbox";
import { toggleAssignment } from "@/app/admin/(dash)/quotations/[id]/actions";
import { cn } from "@/lib/utils";

export function AssignmentMatrix({
  quotationId,
  items,
  factories,
  assignmentsByFactoryAndItem,
}: {
  quotationId: string;
  items: Item[];
  factories: Factory[];
  assignmentsByFactoryAndItem: Record<string, string[]>;
}) {
  const [local, setLocal] = useState<Record<string, Set<string>>>(() => {
    const initial: Record<string, Set<string>> = {};
    for (const f of factories) {
      initial[f.id] = new Set(assignmentsByFactoryAndItem[f.id] ?? []);
    }
    return initial;
  });
  const [, startTransition] = useTransition();

  function toggle(factoryId: string, itemId: string, next: boolean) {
    setLocal((prev) => {
      const copy = { ...prev };
      const set = new Set(copy[factoryId] ?? []);
      if (next) set.add(itemId);
      else set.delete(itemId);
      copy[factoryId] = set;
      return copy;
    });
    startTransition(async () => {
      await toggleAssignment(quotationId, factoryId, itemId, next);
    });
  }

  function toggleColumn(factoryId: string, allOn: boolean) {
    for (const item of items) {
      const current = local[factoryId]?.has(item.id) ?? false;
      if (allOn !== current) toggle(factoryId, item.id, allOn);
    }
  }

  return (
    <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-separate border-spacing-0">
          <thead>
            <tr>
              <th
                scope="col"
                className="text-left px-4 py-3.5 font-medium eyebrow text-[10px] bg-muted/60 sticky left-0 z-20 min-w-[260px] border-b"
              >
                Item
              </th>
              {factories.map((f) => {
                const set = local[f.id] ?? new Set<string>();
                const allOn = items.length > 0 && items.every((i) => set.has(i.id));
                const someOn = !allOn && items.some((i) => set.has(i.id));
                return (
                  <th
                    scope="col"
                    key={f.id}
                    className="px-3 py-3 text-center min-w-[130px] bg-muted/60 border-b align-top"
                  >
                    <div className="font-heading text-base truncate" title={f.name}>
                      {f.name}
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleColumn(f.id, !allOn)}
                      className={cn(
                        "mt-1 text-[10px] tracking-wider uppercase font-medium transition-colors",
                        allOn
                          ? "text-foreground hover:text-destructive"
                          : someOn
                            ? "text-muted-foreground hover:text-foreground"
                            : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {allOn ? "Uncheck all" : "Select all"}
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {items.map((item, rowIdx) => (
              <tr
                key={item.id}
                className={rowIdx % 2 === 0 ? "bg-background" : "bg-muted/30"}
              >
                <th
                  scope="row"
                  className={cn(
                    "text-left px-4 py-3 sticky left-0 z-10 font-normal border-b",
                    rowIdx % 2 === 0 ? "bg-background" : "bg-muted/30"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <ItemPhotos urls={item.photo_urls} size="sm" limit={1} />
                    <div className="min-w-0">
                      <div className="truncate font-heading text-base">
                        {item.name || "(untitled)"}
                      </div>
                    </div>
                  </div>
                </th>
                {factories.map((f) => {
                  const checked = local[f.id]?.has(item.id) ?? false;
                  return (
                    <td
                      key={f.id}
                      className={cn(
                        "px-3 py-3 text-center border-b",
                        checked && "bg-accent/50"
                      )}
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(v) => toggle(f.id, item.id, !!v)}
                        aria-label={`${f.name} / ${item.name ?? "item"}`}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
