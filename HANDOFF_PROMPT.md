# Prompt de inicio — pegá esto en Claude Code

Copiá todo el bloque de abajo y pegalo en **Claude Code** (o en Claude.ai si no tenés el CLI) una vez que descomprimiste el zip y estás dentro de la carpeta `voglia/`.

Claude te va a guiar paso a paso por:

- Crear la cuenta de Supabase (o usar una existente) y generar el proyecto.
- Correr las migraciones y cargar (o saltear) el seed data.
- Crear el bucket de storage.
- Crear la cuenta de Vercel (o usar la existente) y hacer el primer deploy.
- Configurar las variables de entorno y el password del admin.
- Verificar el flujo end-to-end.

---

```
Hola Claude. Acabo de recibir la plataforma Voglia (cotizaciones y órdenes de compra
de joyería). Necesito tu ayuda para montarla en MI propia cuenta de Supabase y MI
propia cuenta de Vercel — quiero independizarme de la instalación del desarrollador
original sin perder los datos actuales (fábricas, cotizaciones de prueba).

Antes de empezar, leé estos dos archivos y pedime confirmación:
1. CLAUDE.md — visión general, arquitectura, file tree, variables de entorno.
2. SETUP.md — guía de setup paso a paso que vamos a seguir.

Una vez que los tengas claros, guiame interactivamente por el proceso completo:

1. Verificá que tengo Node 20+ instalado. Si no, decime cómo instalarlo.
2. Preguntame si ya tengo cuenta de Supabase, GitHub y Vercel. Si falta alguna,
   dame el link directo para crearla.
3. Ayudame a crear el proyecto Supabase. Preguntame la región preferida.
   Acordate de pedirme que guarde la database password.
4. Aplicá las migraciones (supabase/migrations/*.sql) y preguntame si quiero
   cargar el seed data (supabase/seed.sql — 8 fábricas de ejemplo + 2
   cotizaciones que puedo editar/borrar después).
5. Creá el bucket de Storage "items" (público, 10MB, imágenes).
6. Pedime que elija un ADMIN_PASSWORD fuerte (mínimo 16 chars) y ayudame a
   escribir .env.local con todas las variables.
7. Correlo local con `npm install && npm run dev` y ayudame a verificar que
   funciona: login, lista de fábricas, subir una foto a un ítem (para validar
   que el upload a Storage anda).
8. Creá el repo privado en GitHub y hacé el push inicial.
9. Hacé deploy en Vercel configurando las 5 env vars. Acordate de actualizar
   NEXT_PUBLIC_APP_URL con la URL final de Vercel y redesplegar.
10. Al final, dame un resumen con:
    - URL de producción
    - URL del dashboard de Supabase (para administrar la DB)
    - URL del dashboard de Vercel
    - Cómo cambiar el password del admin más adelante
    - Cómo borrar el seed data si ya no lo quiero

Preferencias:
- Sé conciso. Un paso a la vez, no me abrumes con toda la info junta.
- Usá los comandos exactos que tengo que correr, no pseudo-código.
- Si algo falla, explicame el error en 2 líneas y proponé un fix.
- Cuando tengas que pegar valores secretos (service_role key, DB password,
  admin password), acordate de recordarme que son secretos — nunca commitearlos.

Empezá por leer CLAUDE.md y SETUP.md, y después preguntame por el estado de mis
cuentas.
```

---

## Notas adicionales

- Si preferís hacerlo sin asistente, seguí `SETUP.md` directo — está todo lo que necesitás.
- El `CLAUDE.md` es la documentación viva del proyecto. Cualquier cambio futuro debería reflejarse ahí.
- El seed data (`supabase/seed.sql`) trae URLs de fotos que apuntan al Supabase del desarrollador original. Funcionan porque el bucket es público, pero si querés independencia total, editá los ítems desde el UI y re-subí las fotos (o borralos).
- El password del admin por defecto es `admin123` — **cambialo** al primer login.
