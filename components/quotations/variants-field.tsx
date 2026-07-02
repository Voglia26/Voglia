"use client";

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
  variants,
  onChange,
}: {
  variants: VariantDraft[];
  onChange: (variants: VariantDraft[]) => void;
}) {
  function addVariant() {
    onChange([...variants, { label: "", description: "" }]);
  }

  function removeVariant(index: number) {
    onChange(variants.filter((_, i) => i !== index));
  }

  function updateVariant(
    index: number,
    patch: Partial<Pick<VariantDraft, "label" | "description">>
  ) {
    onChange(variants.map((v, i) => (i === index ? { ...v, ...patch } : v)));
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-sm font-medium">Reference quote options</Label>
        <Button type="button" variant="outline" size="sm" onClick={addVariant}>
          <Plus className="h-3.5 w-3.5 mr-1" />
          Add option
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Suggested options for factories (e.g. different stone types). Factories
        see these preloaded and can edit or add their own.
      </p>
      {variants.length === 0 ? (
        <p className="text-xs text-muted-foreground border border-dashed rounded-md p-3">
          No reference options yet. Factories will start from a blank form.
        </p>
      ) : (
        <div className="space-y-2">
          {variants.map((variant, index) => (
            <div
              key={variant.id ?? `new-${index}`}
              className="rounded-lg border border-border p-3 space-y-2"
            >
              <div className="flex gap-2">
                <div className="flex-1 space-y-2">
                  <Input
                    value={variant.label}
                    onChange={(e) =>
                      updateVariant(index, { label: e.target.value })
                    }
                    placeholder="e.g. With normal diamonds"
                  />
                  <Textarea
                    rows={2}
                    value={variant.description}
                    onChange={(e) =>
                      updateVariant(index, { description: e.target.value })
                    }
                    placeholder="Details for the factory (optional)..."
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Remove option"
                  onClick={() => removeVariant(index)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
