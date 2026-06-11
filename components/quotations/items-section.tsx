"use client";

import { useState } from "react";
import type { Item } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { PhotoUpload } from "@/components/items/photo-upload";
import { ItemPhotos } from "@/components/items/item-photos";
import { addItem, updateItem, deleteItem } from "@/app/admin/(dash)/quotations/[id]/actions";

export function ItemsSection({
  quotationId,
  items,
}: {
  quotationId: string;
  items: Item[];
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<Item | null>(null);

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map((item) => (
          <Card
            key={item.id}
            className="p-3 hover:border-foreground/20 hover:shadow-sm transition-all"
          >
            <div className="flex gap-3">
              <ItemPhotos urls={item.photo_urls} size="md" limit={3} />
              <div className="min-w-0 flex-1">
                <h4 className="font-heading text-lg truncate leading-tight">
                  {item.name || "(untitled)"}
                </h4>
                {item.description && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {item.description}
                  </p>
                )}
                <div className="mt-2 flex gap-1">
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    onClick={() => setEditing(item)}
                    aria-label="Edit"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <form action={deleteItem}>
                    <input type="hidden" name="id" value={item.id} />
                    <input type="hidden" name="quotation_id" value={quotationId} />
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      type="submit"
                      aria-label="Delete"
                      onClick={(e) => {
                        if (!confirm("Delete this item?")) e.preventDefault();
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </form>
                </div>
              </div>
            </div>
          </Card>
        ))}

        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger
            render={
              <button
                type="button"
                className="border-2 border-dashed border-border hover:border-foreground/30 rounded-lg p-6 min-h-[128px] flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent/30 transition-all"
              />
            }
          >
            <div className="text-center">
              <Plus className="h-6 w-6 mx-auto mb-1" />
              <span className="eyebrow">Add item</span>
            </div>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg max-h-[min(90vh,720px)] flex flex-col gap-0 p-0 overflow-hidden">
            <DialogHeader className="shrink-0 px-4 pt-4 pb-2">
              <DialogTitle>New item</DialogTitle>
            </DialogHeader>
            <ItemForm
              quotationId={quotationId}
              onSubmit={async (fd) => {
                await addItem(fd);
                setAddOpen(false);
              }}
              submitLabel="Add item"
            />
          </DialogContent>
        </Dialog>
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-lg max-h-[min(90vh,720px)] flex flex-col gap-0 p-0 overflow-hidden">
          <DialogHeader className="shrink-0 px-4 pt-4 pb-2">
            <DialogTitle>Edit item</DialogTitle>
          </DialogHeader>
          {editing && (
            <ItemForm
              quotationId={quotationId}
              item={editing}
              onSubmit={async (fd) => {
                await updateItem(fd);
                setEditing(null);
              }}
              submitLabel="Save"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function ItemForm({
  quotationId,
  item,
  onSubmit,
  submitLabel,
}: {
  quotationId: string;
  item?: Item;
  onSubmit: (fd: FormData) => Promise<void>;
  submitLabel: string;
}) {
  return (
    <form action={onSubmit} className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-2">
      {item && <input type="hidden" name="id" value={item.id} />}
      <input type="hidden" name="quotation_id" value={quotationId} />

      <div>
        <Label className="mb-2 block">Photos</Label>
        <PhotoUpload name="photo_urls" defaultUrls={item?.photo_urls} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="sku">SKU</Label>
        <Input
          id="sku"
          name="sku"
          placeholder="NECK-001"
          defaultValue={item?.sku ?? ""}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" defaultValue={item?.name ?? ""} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          rows={2}
          defaultValue={item?.description ?? ""}
        />
      </div>

      <div>
        <p className="text-sm font-medium mb-2">Specs (optional)</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="weight_g" className="text-xs">Weight (g)</Label>
            <Input
              id="weight_g"
              name="weight_g"
              type="number"
              step="0.01"
              defaultValue={item?.specs?.weight_g ?? ""}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="carats" className="text-xs">Carats</Label>
            <Input
              id="carats"
              name="carats"
              type="number"
              step="0.01"
              defaultValue={item?.specs?.carats ?? ""}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="gold_type" className="text-xs">Gold type</Label>
            <Input
              id="gold_type"
              name="gold_type"
              placeholder="14k yellow"
              defaultValue={item?.specs?.gold_type ?? ""}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="stone_type" className="text-xs">Stone type</Label>
            <Input
              id="stone_type"
              name="stone_type"
              placeholder="Lab diamond"
              defaultValue={item?.specs?.stone_type ?? ""}
            />
          </div>
        </div>
      </div>
      </div>

      <DialogFooter className="sticky bottom-0 z-10 shrink-0 border-t bg-popover px-4 py-4 mx-0 mb-0 mt-0 rounded-none sm:justify-end">
        <Button type="submit">{submitLabel}</Button>
      </DialogFooter>
    </form>
  );
}
