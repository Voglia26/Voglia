"use client";

import { useState } from "react";
import Image from "next/image";
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
import { Plus, Pencil, Trash2, ImageIcon } from "lucide-react";
import { PhotoUpload } from "@/components/items/photo-upload";
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
              {item.photo_url ? (
                <Image
                  src={item.photo_url}
                  alt=""
                  width={88}
                  height={88}
                  className="h-20 w-20 object-cover rounded-md shrink-0"
                  unoptimized
                />
              ) : (
                <div className="h-20 w-20 bg-muted rounded-md flex items-center justify-center shrink-0">
                  <ImageIcon className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
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
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
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
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
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
    <form action={onSubmit} className="space-y-4">
      {item && <input type="hidden" name="id" value={item.id} />}
      <input type="hidden" name="quotation_id" value={quotationId} />

      <div>
        <Label className="mb-2 block">Photo</Label>
        <PhotoUpload name="photo_url" defaultUrl={item?.photo_url} />
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
            <Label htmlFor="gold_weight" className="text-xs">Gold weight (g)</Label>
            <Input
              id="gold_weight"
              name="gold_weight"
              type="number"
              step="0.01"
              defaultValue={item?.specs?.gold_weight ?? ""}
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
          <div className="space-y-1">
            <Label htmlFor="diamond_carat_weight" className="text-xs">Diamond carat weight</Label>
            <Input
              id="diamond_carat_weight"
              name="diamond_carat_weight"
              type="number"
              step="0.01"
              defaultValue={item?.specs?.diamond_carat_weight ?? ""}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="gemstone_carat_weight" className="text-xs">Gemstone carat weight</Label>
            <Input
              id="gemstone_carat_weight"
              name="gemstone_carat_weight"
              placeholder="or N/A"
              defaultValue={item?.specs?.gemstone_carat_weight ?? ""}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="custom_carat_weight" className="text-xs">Custom carat weight</Label>
            <Input
              id="custom_carat_weight"
              name="custom_carat_weight"
              placeholder="e.g. 1.5ct round"
              defaultValue={item?.specs?.custom_carat_weight ?? ""}
            />
          </div>
          <div className="col-span-2 space-y-1">
            <Label htmlFor="additional_details" className="text-xs">Additional details</Label>
            <Textarea
              id="additional_details"
              name="additional_details"
              rows={2}
              placeholder="Any other specs or notes"
              defaultValue={item?.specs?.additional_details ?? ""}
            />
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button type="submit">{submitLabel}</Button>
      </DialogFooter>
    </form>
  );
}
