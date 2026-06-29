"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, Trash2, Upload } from "lucide-react";
import {
  createManualShipment,
  uploadShipmentItemPhoto,
} from "@/app/admin/(dash)/shipments/actions";
import { cn } from "@/lib/utils";

type FactoryOption = { id: string; name: string };

type LineItem = {
  id: string;
  name: string;
  sku: string;
  quantity: string;
  photo_url: string;
};

function emptyLine(): LineItem {
  return {
    id: crypto.randomUUID(),
    name: "",
    sku: "",
    quantity: "1",
    photo_url: "",
  };
}

export function AddShipmentDialog({
  factories,
}: {
  factories: FactoryOption[];
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const photoRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"form" | "upload">("form");
  const [factoryId, setFactoryId] = useState("");
  const [orderDate, setOrderDate] = useState(
    () => new Date().toISOString().slice(0, 10)
  );
  const [expectedDate, setExpectedDate] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<LineItem[]>([emptyLine()]);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [uploadingPhoto, setUploadingPhoto] = useState<string | null>(null);

  function reset() {
    setMode("form");
    setFactoryId("");
    setOrderDate(new Date().toISOString().slice(0, 10));
    setExpectedDate("");
    setNotes("");
    setLines([emptyLine()]);
    setUploadFile(null);
    setErr(null);
  }

  function updateLine(id: string, patch: Partial<LineItem>) {
    setLines((prev) =>
      prev.map((l) => (l.id === id ? { ...l, ...patch } : l))
    );
  }

  async function handlePhotoUpload(lineId: string, file: File) {
    setUploadingPhoto(lineId);
    setErr(null);
    const fd = new FormData();
    fd.append("file", file);
    const res = await uploadShipmentItemPhoto(fd);
    setUploadingPhoto(null);
    if (res.ok) {
      updateLine(lineId, { photo_url: res.url });
    } else {
      setErr(res.error);
    }
  }

  function submit() {
    setErr(null);
    if (!factoryId) {
      setErr("Select a factory.");
      return;
    }

    const fd = new FormData();
    fd.append("factory_id", factoryId);
    fd.append("order_date", orderDate);
    if (expectedDate) fd.append("expected_arrival_date", expectedDate);
    if (notes.trim()) fd.append("notes", notes.trim());

    if (mode === "upload" && uploadFile) {
      fd.append("file", uploadFile);
    }

    const items = lines
      .map((l) => ({
        name: l.name.trim(),
        sku: l.sku.trim() || "—",
        quantity: Number(l.quantity),
        photo_url: l.photo_url || null,
      }))
      .filter((l) => l.name && Number.isFinite(l.quantity) && l.quantity >= 1);

    if (mode === "form" && items.length === 0) {
      setErr("Add at least one product line.");
      return;
    }

    fd.append("items_json", JSON.stringify(items));

    startTransition(async () => {
      const res = await createManualShipment(fd);
      if (res.ok) {
        setOpen(false);
        reset();
        router.push(`/admin/shipments/${res.id}`);
        router.refresh();
      } else {
        setErr(res.error);
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
      }}
    >
      <DialogTrigger
        render={<Button type="button">Add shipment</Button>}
      />
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col gap-0 p-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <DialogTitle>Add shipment</DialogTitle>
          <DialogDescription>
            Fill in the form or upload a PDF/Excel/CSV document. CSV files with
            name and quantity columns can auto-import product lines.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          <div className="inline-flex rounded-lg border border-input p-0.5 bg-muted/30">
            <button
              type="button"
              onClick={() => setMode("form")}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                mode === "form"
                  ? "bg-background shadow-sm"
                  : "text-muted-foreground"
              )}
            >
              Form
            </button>
            <button
              type="button"
              onClick={() => setMode("upload")}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                mode === "upload"
                  ? "bg-background shadow-sm"
                  : "text-muted-foreground"
              )}
            >
              Upload file
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="sh-factory">Factory</Label>
              <select
                id="sh-factory"
                value={factoryId}
                onChange={(e) => setFactoryId(e.target.value)}
                className="block h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
              >
                <option value="">Select factory</option>
                {factories.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sh-order-date">Order date</Label>
              <Input
                id="sh-order-date"
                type="date"
                value={orderDate}
                onChange={(e) => setOrderDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sh-expected">Expected arrival</Label>
              <Input
                id="sh-expected"
                type="date"
                value={expectedDate}
                onChange={(e) => setExpectedDate(e.target.value)}
              />
            </div>
          </div>

          {mode === "upload" && (
            <div className="space-y-2">
              <Label>Document (PDF, Excel, or CSV)</Label>
              <div
                className="border border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => fileRef.current?.click()}
              >
                <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm font-medium">
                  {uploadFile ? uploadFile.name : "Click to upload"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  CSV with name + quantity columns imports lines automatically
                </p>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf,.xlsx,.xls,.csv,application/pdf,text/csv"
                  className="hidden"
                  onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                />
              </div>
            </div>
          )}

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Products</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setLines((p) => [...p, emptyLine()])}
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add line
              </Button>
            </div>
            {lines.map((line, idx) => (
              <div
                key={line.id}
                className="rounded-lg border p-3 space-y-3 bg-muted/20"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    Product {idx + 1}
                  </span>
                  {lines.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() =>
                        setLines((p) => p.filter((l) => l.id !== line.id))
                      }
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1 col-span-2 sm:col-span-1">
                    <Label className="text-xs">Name</Label>
                    <Input
                      value={line.name}
                      onChange={(e) =>
                        updateLine(line.id, { name: e.target.value })
                      }
                      placeholder="Product name"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">SKU</Label>
                    <Input
                      value={line.sku}
                      onChange={(e) =>
                        updateLine(line.id, { sku: e.target.value })
                      }
                      placeholder="Optional"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Qty</Label>
                    <Input
                      type="number"
                      min={1}
                      value={line.quantity}
                      onChange={(e) =>
                        updateLine(line.id, { quantity: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-1 col-span-2 sm:col-span-1">
                    <Label className="text-xs">Photo</Label>
                    <div className="flex items-center gap-2">
                      {line.photo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={line.photo_url}
                          alt=""
                          className="h-10 w-10 rounded object-cover border"
                        />
                      ) : null}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={uploadingPhoto === line.id}
                        onClick={() => photoRefs.current[line.id]?.click()}
                      >
                        {uploadingPhoto === line.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          "Upload"
                        )}
                      </Button>
                      <input
                        ref={(el) => {
                          photoRefs.current[line.id] = el;
                        }}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) void handlePhotoUpload(line.id, f);
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sh-notes">Notes (optional)</Label>
            <Textarea
              id="sh-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {err && (
            <p className="text-sm text-destructive border border-destructive/30 rounded-md p-3">
              {err}
            </p>
          )}
        </div>

        <div className="px-6 py-4 border-t shrink-0 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={submit} disabled={pending}>
            {pending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create shipment
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
