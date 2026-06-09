import type { Item, ItemSpecs } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ItemDetails({
  item,
  faded,
  size = "lg",
}: {
  item: Item;
  faded?: boolean;
  size?: "md" | "lg";
}) {
  const titleClass =
    size === "lg"
      ? "font-heading text-2xl sm:text-3xl"
      : "font-heading text-xl";

  return (
    <div className={cn(faded && "opacity-60")}>
      <h3
        className={cn(
          titleClass,
          "leading-tight",
          faded && "line-through"
        )}
      >
        {item.name || "(untitled)"}
      </h3>
      {item.description ? (
        <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">
          {item.description}
        </p>
      ) : null}
      {item.specs ? <SpecsList specs={item.specs} /> : null}
    </div>
  );
}

function SpecsList({ specs }: { specs: ItemSpecs }) {
  const entries: { label: string; value: string }[] = [];

  if (specs.weight_g !== null && specs.weight_g !== undefined) {
    entries.push({ label: "Weight", value: `${specs.weight_g} g` });
  }
  if (specs.carats !== null && specs.carats !== undefined) {
    entries.push({ label: "Carats", value: `${specs.carats} ct` });
  }
  if (specs.gold_type) {
    entries.push({ label: "Gold type", value: specs.gold_type });
  }
  if (specs.stone_type) {
    entries.push({ label: "Stone type", value: specs.stone_type });
  }

  if (entries.length === 0) return null;

  return (
    <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
      {entries.map((entry) => (
        <div key={entry.label}>
          <dt className="text-xs text-muted-foreground eyebrow">{entry.label}</dt>
          <dd className="font-medium mt-0.5">{entry.value}</dd>
        </div>
      ))}
    </dl>
  );
}
