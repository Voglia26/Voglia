# Setup Voglia en tu propia cuenta

Guía paso a paso para montar la plataforma en **tu** Supabase y **tu** Vercel, conservando los datos actuales (fábricas, cotizaciones, etc.) que podés editar o borrar libremente desde el UI.

**Tiempo estimado:** 20-30 minutos si es la primera vez con Supabase/Vercel.

---

## 1. Requisitos

- Node.js 20+ instalado (`node --version`)
- Cuenta de [GitHub](https://github.com/signup) (gratuita)
- Cuenta de [Supabase](https://supabase.com) (gratuita, suficiente para arrancar)
- Cuenta de [Vercel](https://vercel.com/signup) (gratuita)

---

## 2. Supabase — crear proyecto

1. Entrá a https://supabase.com/dashboard y `New project`.
2. Nombre: `voglia` (o el que quieras). Elegí región cercana a vos.
3. Generá una **Database password** fuerte y **guardala** — la vas a necesitar.
4. Esperá ~2 minutos a que se provisione.
5. En el panel del proyecto andá a **Settings → API** y copiá estos 3 valores:
   - `Project URL` (ej: `https://xxxx.supabase.co`)
   - `anon public` key
   - `service_role` key (SECRETA — no la pongas en el cliente)

---

## 3. Aplicar schema + seed

**Opción A — desde el dashboard (más simple):**

1. En Supabase: **SQL Editor → New query**.
2. Pegá el contenido de `supabase/migrations/20260424190900_init.sql` y `Run`.
3. Pegá el contenido de `supabase/migrations/20260424210000_updates.sql` y `Run`.
4. (Opcional) Pegá `supabase/seed.sql` y `Run` — esto carga 8 fábricas de ejemplo y 2 cotizaciones. Podés editarlas o borrarlas después desde el UI.

**Opción B — con CLI (si ya usás supabase CLI):**

```bash
npx supabase link --project-ref <tu-ref>
npx supabase db push --db-url "postgresql://postgres.<tu-ref>:<DB_PASSWORD>@aws-0-<region>.pooler.supabase.com:6543/postgres"
# Seed (opcional):
cat supabase/seed.sql | psql "postgresql://postgres.<tu-ref>:<DB_PASSWORD>@aws-0-<region>.pooler.supabase.com:6543/postgres"
```

---

## 4. Crear el bucket de Storage

1. Supabase dashboard → **Storage → New bucket**.
2. Name: `items`
3. **Public bucket: ON**
4. File size limit: `10 MB`
5. Allowed MIME types: `image/jpeg, image/png, image/webp, image/heic`
6. Create bucket.

---

## 5. Correr en local (opcional)

```bash
cd voglia
npm install
cp .env.local.example .env.local
```

Editá `.env.local` con los valores del paso 2 y poné un `ADMIN_PASSWORD` fuerte:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
ADMIN_PASSWORD=tu-password-seguro
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Arrancá:

```bash
npm run dev
```

Abrí http://localhost:3000 → te redirige al login → entrá con tu `ADMIN_PASSWORD`.

---

## 6. Subir a GitHub

```bash
git init
git add -A
git commit -m "Initial Voglia setup"
# Creá el repo en https://github.com/new (privado recomendado), después:
git remote add origin https://github.com/<tu-usuario>/voglia.git
git branch -M main
git push -u origin main
```

---

## 7. Deploy en Vercel

**Vía Vercel web (más simple):**

1. https://vercel.com/new → `Import` tu repo de GitHub.
2. Framework: `Next.js` (auto-detectado).
3. **Environment Variables** → pegá las mismas 5 variables del paso 5 (`NEXT_PUBLIC_APP_URL` la podés dejar vacía y actualizarla al final).
4. Deploy.
5. Cuando termine, copiá la URL que te da Vercel (ej `voglia-xxx.vercel.app`) y:
   - Settings → Environment Variables → editá `NEXT_PUBLIC_APP_URL` con esa URL.
   - Deployments → redeploy el último.

**Vía CLI (si preferís):**

```bash
npm install -g vercel
vercel login
vercel --yes
# Agregar cada env var:
echo -n "https://xxxx.supabase.co" | vercel env add NEXT_PUBLIC_SUPABASE_URL production
echo -n "<anon-key>" | vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
echo -n "<service-role>" | vercel env add SUPABASE_SERVICE_ROLE_KEY production
echo -n "tu-password" | vercel env add ADMIN_PASSWORD production
echo -n "https://<tu-dominio>.vercel.app" | vercel env add NEXT_PUBLIC_APP_URL production
vercel --prod --yes
```

---

## 8. (Opcional) Dominio custom

En Vercel → Project Settings → Domains → Add. Seguí las instrucciones DNS. Actualizá `NEXT_PUBLIC_APP_URL` al dominio final y re-deploy.

---

## 9. Chequeo final

1. Abrí tu URL de Vercel → redirige a `/admin/login`.
2. Entrá con tu password.
3. Verás el dashboard con las cotizaciones y POs del seed (si lo aplicaste).
4. Probá el flujo completo:
   - `Factories` → deberías ver las 8 fábricas del seed (podés borrar las que no uses).
   - `Quotations` → abrí una, copiá un link de fábrica, abrilo en incógnito → debería mostrar el formulario.
   - Subí una foto a un ítem para confirmar que el upload funciona.

---

## 10. Mantenimiento

- **Agregar/editar ítems, fábricas, cotizaciones:** todo desde el UI admin.
- **Cambiar branding (logo, colores):** ver `CLAUDE.md` → sección *Customización frecuente*.
- **Backups:** Supabase hace backups diarios automáticos en el plan Free (7 días de retención). Para respaldos manuales, Settings → Database → Backups.
- **Agregar columnas al quote:** requiere una migración. Ver `CLAUDE.md`.

---

## Soporte

Toda la arquitectura y decisiones producto están documentadas en `CLAUDE.md`. Si le pasás ese archivo + el repo a Claude (o cualquier asistente de código), tendrá el contexto completo para ayudarte.

Si algo no funciona, leé `CLAUDE.md` antes de abrir un issue — probablemente la respuesta está ahí.
