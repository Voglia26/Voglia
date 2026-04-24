# Voglia — Plataforma de Cotizaciones y Órdenes de Compra

Herramienta interna del negocio de joyería Voglia para:

1. Crear **cotizaciones** con ítems (foto + specs), asignar manualmente qué fábricas cotizan cada ítem.
2. Generar un **link mágico por fábrica** (sin login) y compartirlo por WhatsApp.
3. Recibir respuestas (gold loss, total gold cost, diamond cost, cost per carat, labor, other fees, *o* un final price único) con opción de marcar ítems como **no cotizables**.
4. **Comparar** propuestas, elegir ganador por ítem + cantidad.
5. Generar **órdenes de compra** por fábrica ganadora con estados `pending → approved → in_progress → sent → received` — la fábrica puede avanzar el estado desde su link público.
6. Panel admin con filtros de PO por fábrica, estado y rango de fechas.

---

## Demo y entornos

- **Producción actual:** https://voglia.vercel.app (la que monta el cliente reemplazará esta URL)
- **Password admin por defecto:** `admin123` — cambiarlo antes de ir a producción

---

## Stack

| Capa | Tecnología |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Lenguaje | TypeScript strict |
| UI | Tailwind CSS v4 + shadcn/ui (base-ui under the hood) + lucide-react + framer-motion |
| DB / Storage | Supabase Postgres + Supabase Storage (bucket público `items`) |
| PDF | `@react-pdf/renderer` (se genera en server route) |
| Hosting | Vercel |
| Auth admin | Password en `ADMIN_PASSWORD` env var, middleware + cookie HTTP-only |
| Auth fábrica | Ninguna: token UUID opaco en la URL (`/q/[token]`, `/po/[token]`) |

**No hay emails automáticos.** El admin comparte los links por WhatsApp manualmente.

---

## Estructura de archivos

```
voglia/
├─ app/
│  ├─ admin/
│  │  ├─ login/page.tsx            # password login (eyebrow + serif display)
│  │  └─ (dash)/                   # layout group con sidebar / topbar
│  │     ├─ layout.tsx             # renderiza AdminShell
│  │     ├─ page.tsx               # dashboard (active quotations + pending POs)
│  │     ├─ factories/page.tsx     # CRUD fábricas
│  │     ├─ quotations/
│  │     │  ├─ page.tsx            # lista con counts aceptadas/total
│  │     │  └─ [id]/
│  │     │     ├─ page.tsx         # editor: items + asignaciones + share links
│  │     │     ├─ actions.ts       # server actions (add/update/delete item, upload photo, toggle assignment, send/delete quotation)
│  │     │     └─ compare/
│  │     │        ├─ page.tsx      # comparativa + award winners
│  │     │        └─ actions.ts    # generatePurchaseOrders
│  │     └─ purchase-orders/
│  │        ├─ page.tsx            # lista con filtros
│  │        └─ [id]/
│  │           ├─ page.tsx         # detalle PO + POStatusEditor + copy link
│  │           └─ actions.ts       # setPurchaseOrderStatus, deletePurchaseOrder
│  ├─ q/[token]/                   # PÚBLICO — formulario de fábrica
│  │  ├─ page.tsx
│  │  └─ actions.ts                # submitFactoryQuotation
│  ├─ po/[token]/                  # PÚBLICO — vista PO (fábrica avanza estado)
│  │  ├─ page.tsx
│  │  └─ actions.ts                # advancePOStatus (whitelist de transiciones)
│  ├─ api/po/[token]/pdf/route.ts  # PDF del PO con @react-pdf/renderer
│  ├─ layout.tsx                   # root layout (fonts Jost + Cormorant Garamond)
│  ├─ globals.css                  # tokens, typography primitives, animations
│  └─ page.tsx                     # redirige / → /admin
├─ components/
│  ├─ admin/
│  │  ├─ admin-shell.tsx           # sidebar desktop + topbar+Sheet mobile
│  │  └─ page-header.tsx           # eyebrow + display title + description + actions
│  ├─ brand/
│  │  └─ logo.tsx                  # <VogliaLogo /> (default 315x90)
│  ├─ factories/                   # AddFactoryButton, FactoriesList
│  ├─ items/
│  │  └─ photo-upload.tsx          # sube vía server action con service_role
│  ├─ quotations/
│  │  ├─ items-section.tsx         # grid de ítems + modal add/edit
│  │  ├─ assignment-matrix.tsx     # tabla ítems × fábricas con checkboxes
│  │  ├─ comparison-table.tsx      # comparativa sortable con Award-to
│  │  └─ share-links.tsx           # links mágicos por fábrica
│  ├─ public/
│  │  ├─ factory-form.tsx          # formulario: decline + final price + line items
│  │  └─ po-status-control.tsx     # factory advances pending→approved→in_progress→sent
│  ├─ purchase-orders/
│  │  ├─ po-filters.tsx            # status, factory, from, to
│  │  ├─ status-editor.tsx         # admin dropdown a cualquier estado
│  │  └─ copy-public-link.tsx      # copy link + descargar PDF
│  └─ ui/                          # shadcn primitives
├─ lib/
│  ├─ supabase/
│  │  ├─ admin.ts                  # service_role client (server only)
│  │  ├─ server.ts                 # SSR client con cookies
│  │  └─ client.ts                 # browser client
│  ├─ auth.ts                      # signIn / signOut / isAuthenticated
│  ├─ po.ts                        # loadPurchaseOrderByToken / ById
│  ├─ types.ts                     # tipos DB + helpers quoteTotal, PO status flow
│  └─ utils.ts                     # cn()
├─ middleware.ts                   # protege /admin/*
├─ supabase/
│  ├─ migrations/
│  │  ├─ 20260424190900_init.sql       # schema inicial
│  │  └─ 20260424210000_updates.sql    # decline + final_price + PO status flow + storage policy
│  ├─ seed.sql                     # datos actuales (8 fábricas, 2 quotations, etc.)
│  └─ config.toml                  # supabase local (opcional)
├─ scripts/
│  └─ dump-seed.mjs                # script para regenerar seed.sql desde una DB
├─ public/
│  ├─ voglia-logo.svg              # logo oficial
│  └─ favicon.svg                  # favicon oficial
├─ .env.local.example
├─ next.config.ts
├─ components.json                 # shadcn config
├─ tsconfig.json
├─ tailwind / postcss configs
└─ package.json
```

---

## Modelo de datos

Definido en `supabase/migrations/`. Entidades clave:

- **factories** — fábricas proveedoras (name, notes).
- **quotations** — una cotización/ronda (title, status: `draft` | `sent` | `closed`).
- **items** — joyas dentro de una cotización (name, description, specs jsonb, photo_url). El campo `sku` quedó en la tabla pero no lo pide el formulario.
- **quotation_factories** — participación de una fábrica en una cotización. Contiene el `token` UUID del link mágico y `accepted_at` cuando responde.
- **item_assignments** — qué ítems ve cada fábrica.
- **quotes** — respuesta por ítem. Columnas: `gold_loss, total_gold_cost, diamond_cost, cost_per_carat, labor, other_fees, final_price, declined, notes`.
- **purchase_orders** — orden generada post-adjudicación. Estado: `pending | approved | in_progress | sent | received`. Timestamps por transición (`approved_at, in_progress_at, sent_at, received_at`).
- **purchase_order_items** — líneas de la PO (quantity, ref a item + quote).

**RLS está deshabilitado** — la app sólo usa el `service_role` desde rutas server. El bucket `items` es público para lectura, la escritura va por server action con `service_role` (fixea el error de upload desde el browser).

---

## Reglas producto cerradas

- Link mágico sin login; admin comparte por WhatsApp (sin emails automáticos).
- Plantilla de columnas del quote es fija y global.
- Idioma de la UI pública: **inglés**. Admin: español en copy del admin / inglés en UI primitives.
- Asignación fábrica ↔ ítem es 100% manual.
- Una fábrica puede marcar un ítem como "Cannot quote this item" (disables los inputs) o dejar el `final_price` para saltarse el breakdown.
- Estados PO: `pending → approved → in_progress → sent → received`. La fábrica sólo avanza hasta `sent`; `received` es del admin.
- Sin histórico multi-cotización, sin deadlines, sin import CSV, sin multi-admin.

---

## Variables de entorno

Copiar `.env.local.example` a `.env.local` y completar:

```
NEXT_PUBLIC_SUPABASE_URL=        # https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=   # anon key
SUPABASE_SERVICE_ROLE_KEY=       # service_role key (SECRETO, solo server)
ADMIN_PASSWORD=                  # ¡Cambiar por algo robusto!
NEXT_PUBLIC_APP_URL=             # URL pública (http://localhost:3000 en dev)
```

En Vercel, agregarlas como Environment Variables en el proyecto (misma para `Production` y `Preview`).

---

## Setup desde cero

1. **Clonar / descomprimir el proyecto** y `cd voglia/`.
2. **Instalar dependencias:** `npm install`.
3. **Crear proyecto Supabase** (https://supabase.com/dashboard → New project). Elegí región cercana al cliente.
4. Copiar del dashboard:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`
   - Database password (lo que elegiste al crear el proyecto)
5. **Aplicar migraciones + seed:**
   ```bash
   npx supabase link --project-ref <tu-ref>
   npx supabase db push --db-url "postgresql://postgres.<tu-ref>:<DB_PASSWORD>@aws-0-<region>.pooler.supabase.com:6543/postgres"
   # Aplicar seed (opcional — 8 fábricas de ejemplo, borrables desde el UI):
   PGPASSWORD=<DB_PASSWORD> psql -h aws-0-<region>.pooler.supabase.com -p 6543 -U postgres.<tu-ref> -d postgres -f supabase/seed.sql
   ```
   Si no tenés `psql` instalado, pegar `supabase/seed.sql` en el SQL Editor del dashboard Supabase y ejecutar.
6. **Crear bucket Storage `items` (público):**
   - Dashboard Supabase → Storage → New bucket
   - Name: `items`, Public: ON, File size limit: 10 MB, Allowed MIME types: `image/jpeg, image/png, image/webp, image/heic`
7. **Configurar `.env.local`** con los valores del paso 4. Poné un `ADMIN_PASSWORD` fuerte.
8. **Correr local:** `npm run dev` → http://localhost:3000 → redirige a `/admin/login`.
9. **Deploy a Vercel:**
   ```bash
   npm install -g vercel
   vercel login
   vercel --yes              # linkea + primer deploy
   vercel env add NEXT_PUBLIC_SUPABASE_URL production
   vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
   vercel env add SUPABASE_SERVICE_ROLE_KEY production
   vercel env add ADMIN_PASSWORD production
   vercel env add NEXT_PUBLIC_APP_URL production     # URL que te dio Vercel
   vercel --prod --yes
   ```

---

## Comandos útiles

```bash
npm run dev           # desarrollo (Turbopack)
npm run build         # build producción (tsc + optimización)
npx tsc --noEmit      # sólo typecheck
npx supabase db push --db-url <...>  # aplicar migraciones
node scripts/dump-seed.mjs           # regenerar supabase/seed.sql (editá el script con tus credenciales)
```

---

## Customización frecuente

- **Columnas del quote** — editar `QUOTE_COLUMNS` en `lib/types.ts`. Si agregás, también agregar columna en `quotes` (migración).
- **Estados de PO** — `PURCHASE_ORDER_STATUS_FLOW` y `PURCHASE_ORDER_STATUS_LABELS` en `lib/types.ts` + migración del enum.
- **Colores / tipografía** — tokens en `app/globals.css`. Las fuentes son Jost (body) + Cormorant Garamond (display) cargadas vía `next/font/google` en `app/layout.tsx`.
- **Logo** — reemplazar `public/voglia-logo.svg` y `public/favicon.svg`. Tamaño default en `components/brand/logo.tsx`.
- **Copy del admin en español** — el cliente es bilingüe; UI pública siempre en inglés. Editar los strings en `app/admin/**/page.tsx`.
- **Seed data** — `supabase/seed.sql`. El cliente puede editar/borrar desde el UI o correr `truncate table ... cascade` desde el SQL editor antes de aplicar un seed distinto.

---

## Handoff

- Hay un `HANDOFF_PROMPT.md` en la raíz: el cliente lo pega en Claude Code (o Claude.ai) y el asistente lo guía paso a paso para crear cuentas Supabase + Vercel, desplegar, y transferir los dominios si los hay.
- Este `CLAUDE.md` está pensado para que futuras sesiones del asistente tengan contexto completo sin tener que explorar el repo.
