import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { Card } from "@/components/ui/card";
import type { Factory } from "@/lib/types";
import { FactoriesList } from "@/components/factories/factories-list";
import { AddFactoryButton } from "@/components/factories/add-factory-button";
import { PageHeader } from "@/components/admin/page-header";

export default async function FactoriesPage() {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("factories")
    .select("*")
    .order("name", { ascending: true });

  const factories: Factory[] = data ?? [];

  async function create(formData: FormData) {
    "use server";
    const name = String(formData.get("name") ?? "").trim();
    const notes = String(formData.get("notes") ?? "").trim() || null;
    if (!name) return;
    const client = createAdminClient();
    await client.from("factories").insert({ name, notes });
    revalidatePath("/admin/factories");
  }

  async function update(formData: FormData) {
    "use server";
    const id = String(formData.get("id") ?? "");
    const name = String(formData.get("name") ?? "").trim();
    const notes = String(formData.get("notes") ?? "").trim() || null;
    if (!id || !name) return;
    const client = createAdminClient();
    await client.from("factories").update({ name, notes }).eq("id", id);
    revalidatePath("/admin/factories");
  }

  async function remove(formData: FormData) {
    "use server";
    const id = String(formData.get("id") ?? "");
    if (!id) return;
    const client = createAdminClient();
    await client.from("factories").delete().eq("id", id);
    revalidatePath("/admin/factories");
  }

  return (
    <div>
      <PageHeader
        eyebrow="Partners"
        title="Factories"
        description="The factories you request quotations from."
        actions={<AddFactoryButton action={create} />}
      />

      {factories.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground border-dashed">
          <p className="font-heading text-xl mb-2">No factories yet</p>
          <p className="text-sm">Add your first factory to start quoting.</p>
        </Card>
      ) : (
        <FactoriesList
          factories={factories}
          updateAction={update}
          deleteAction={remove}
        />
      )}
    </div>
  );
}
