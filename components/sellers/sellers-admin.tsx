"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  createSeller,
  resetSellerPassword,
  setSellerActive,
} from "@/app/admin/(dash)/sellers/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Loader2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export type SellerRow = {
  id: string;
  username: string;
  display_name: string;
  active: boolean;
  created_at: string;
};

function CredentialsBanner({
  username,
  password,
  onDismiss,
}: {
  username: string;
  password: string;
  onDismiss: () => void;
}) {
  return (
    <div className="rounded-xl border border-emerald-300/80 bg-emerald-50 px-4 py-3 text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100">
      <p className="text-sm font-medium">Credenciales temporales</p>
      <p className="text-sm mt-1 tabular-nums">
        Usuario: <span className="font-semibold">{username}</span>
        {" · "}
        Contraseña: <span className="font-semibold">{password}</span>
      </p>
      <p className="text-xs opacity-80 mt-1">
        Copiá y enviá esto ahora — no se vuelve a mostrar después de cerrar.
      </p>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="mt-3"
        onClick={onDismiss}
      >
        Entendido
      </Button>
    </div>
  );
}

export function SellersAdmin({ sellers }: { sellers: SellerRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<{
    username: string;
    password: string;
  } | null>(null);

  function onCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await createSeller(formData);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setCredentials({ username: res.username, password: res.password });
      setOpen(false);
      router.refresh();
    });
  }

  function handleReset(id: string) {
    setError(null);
    if (
      !confirm(
        "¿Resetear la contraseña a usuario+26? Se mostrará la contraseña temporal."
      )
    ) {
      return;
    }
    startTransition(async () => {
      const res = await resetSellerPassword(id);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setCredentials({ username: res.username, password: res.password });
      router.refresh();
    });
  }

  function handleToggle(id: string, nextActive: boolean) {
    setError(null);
    const msg = nextActive
      ? "¿Reactivar esta vendedora? Podrá iniciar sesión de nuevo."
      : "¿Desactivar esta vendedora? No podrá iniciar sesión. Sus pedidos se conservan.";
    if (!confirm(msg)) return;
    startTransition(async () => {
      const res = await setSellerActive(id, nextActive);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {credentials && (
        <CredentialsBanner
          username={credentials.username}
          password={credentials.password}
          onDismiss={() => setCredentials(null)}
        />
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button />}>
            <Plus className="h-4 w-4 mr-2" />
            Nueva vendedora
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nueva vendedora</DialogTitle>
            </DialogHeader>
            <form onSubmit={onCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Usuario</Label>
                <Input
                  id="username"
                  name="username"
                  required
                  autoFocus
                  autoComplete="off"
                  placeholder="ej. sofia"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="display_name">Nombre para mostrar</Label>
                <Input
                  id="display_name"
                  name="display_name"
                  required
                  placeholder="ej. Sofía"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña inicial (opcional)</Label>
                <Input
                  id="password"
                  name="password"
                  type="text"
                  autoComplete="off"
                  placeholder="Vacío = usuario + 26 (ej. sofia26)"
                />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={pending}>
                  {pending && (
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  )}
                  Crear
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {sellers.length > 0 && (
        <ul className="space-y-3">
          {sellers.map((s) => (
            <li
              key={s.id}
              className={cn(
                "rounded-xl border p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between",
                !s.active && "bg-muted/40 opacity-80"
              )}
            >
              <div className="min-w-0">
                <p className="font-medium truncate">{s.display_name}</p>
                <p className="text-sm text-muted-foreground tabular-nums">
                  @{s.username}
                </p>
                <p className="text-xs mt-1">
                  {s.active ? (
                    <span className="text-emerald-700 dark:text-emerald-300">
                      Activa
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Desactivada</span>
                  )}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 shrink-0">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  onClick={() => handleReset(s.id)}
                >
                  Resetear contraseña
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={s.active ? "destructive" : "default"}
                  disabled={pending}
                  onClick={() => handleToggle(s.id, !s.active)}
                >
                  {s.active ? "Desactivar" : "Reactivar"}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
