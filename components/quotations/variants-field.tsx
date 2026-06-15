"use client";

import { useState } from "react";
import type { ItemVariant } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Plus, Trash2 } from "lucide-react";

export type VariantDraft = {
  id?: string;
  label: string;
  description: string;
};

export function VariantsField({
  defaultVariants,
}: {
  defaultVariants?: ItemVariant[];
}) {
  const [variants, setVariants] = useState<VariantDraft[]>(() =>
    defaultVariants?.length
      ? defaultVariants.map((v) => ({
          id: v.id,
          label: v.label,
          description: v.description ?? "",
        }))
      : [{ label: "", description: "" }]
  );

  function update(index: number, patch: Partial<VariantDraft>) {
    setVariants((prev) =>
      prev.map((v, i) => (i === index ? { ...v, ...patch } : v))
    );
  }

  function addVariant() {
    setVariants((prev) => [...prev, { label: "", description: "" }]);
  }

  function removeVariant(index: number) {
    setVariants((prev) =>
      prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-sm font-medium">Quote variants</Label>
        <Button type="button" variant="outline" size="sm" onClick={addVariant}>
          <Plus className="h-3.5 w-3.5 mr-1" />
          Add variant
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Each variant is quoted separately by the factory (e.g. different stone
        options).
      </p>
      <div className="space-y-3">
        {variants.map((variant, index) => (
          <div
            key={variant.id ?? `new-${index}`}
            className="rounded-lg border border-border bg-muted/20 p-3 space-y-2"
          >
            <div className="flex items-start gap-2">
              <div className="flex-1 space-y-2">
                <div className="space-y-1">
                  <Label className="text-xs">Label</Label>
                  <Input
                    value={variant.label}
                    onChange={(e) => update(index, { label: e.target.value })}
                    placeholder="Con diamantes naturales"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Description (optional)</Label>
                  <Textarea
                    value={variant.description}
                    onChange={(e) =>
                      update(index, { description: e.target.value })
                    }
                    rows={2}
                    placeholder="Details for the factory about this variant..."
                  />
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Remove variant"
                disabled={variants.length <= 1}
                onClick={() => removeVariant(index)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>
      <input
        type="hidden"
        name="variants_json"
        value={JSON.stringify(variants)}
        readOnly
      />
    </div>
  );
}
