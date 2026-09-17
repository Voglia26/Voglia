"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashPassword, requireAdmin } from "@/lib/auth";

function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, "");
}

function defaultSellerPassword(username: string): string {
  return `${normalizeUsername(username)}26`;
}

export async function createSeller(
  formData: FormData
): Promise<
  | { ok: true; username: string; password: string }
  | { ok: false; error: string }
> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "Unauthorized" };

  const username = normalizeUsername(String(formData.get("username") ?? ""));
  const display_name = String(formData.get("display_name") ?? "").trim();
  const passwordRaw = String(formData.get("password") ?? "").trim();
  const password = passwordRaw || defaultSellerPassword(username);

  if (!username || !display_name) {
    return { ok: false, error: "Usuario y nombre son obligatorios" };
  }
  if (!/^[a-z0-9._-]+$/.test(username)) {
    return {
      ok: false,
      error: "Usuario: solo minúsculas, números, punto, guion o guion bajo",
    };
  }
  if (password.length < 4) {
    return { ok: false, error: "La contraseña es demasiado corta" };
  }

  const supabase = createAdminClient();
  const { data: existing } = await supabase
    .from("app_users")
    .select("id")
    .eq("username", username)
    .maybeSingle();

  if (existing) {
    return { ok: false, error: "Ese usuario ya existe" };
  }

  const { error } = await supabase.from("app_users").insert({
    username,
    display_name,
    password_hash: hashPassword(password),
    role: "seller",
    active: true,
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/sellers");
  revalidatePath("/admin/customer-orders");
  return { ok: true, username, password };
}

export async function resetSellerPassword(
  sellerId: string
): Promise<
  | { ok: true; username: string; password: string }
  | { ok: false; error: string }
> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "Unauthorized" };

  const id = sellerId.trim();
  if (!id) return { ok: false, error: "Vendedora inválida" };

  const supabase = createAdminClient();
  const { data: seller } = await supabase
    .from("app_users")
    .select("id, username, role")
    .eq("id", id)
    .maybeSingle();

  if (!seller || seller.role !== "seller") {
    return { ok: false, error: "Vendedora no encontrada" };
  }

  const password = defaultSellerPassword(seller.username);
  const { error } = await supabase
    .from("app_users")
    .update({ password_hash: hashPassword(password) })
    .eq("id", id)
    .eq("role", "seller");

  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/sellers");
  return { ok: true, username: seller.username, password };
}

export async function setSellerActive(
  sellerId: string,
  active: boolean
): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "Unauthorized" };

  const id = sellerId.trim();
  if (!id) return { ok: false, error: "Vendedora inválida" };

  const supabase = createAdminClient();
  const { data: seller } = await supabase
    .from("app_users")
    .select("id, role")
    .eq("id", id)
    .maybeSingle();

  if (!seller || seller.role !== "seller") {
    return { ok: false, error: "Vendedora no encontrada" };
  }

  const { error } = await supabase
    .from("app_users")
    .update({ active })
    .eq("id", id)
    .eq("role", "seller");

  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/sellers");
  revalidatePath("/admin/customer-orders");
  return { ok: true };
}
