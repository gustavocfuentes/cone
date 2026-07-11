# Generador de imagenes — version Cloudflare Workers (con assets)

Esta carpeta es un sitio listo para subir a **Cloudflare Workers** usando el flujo
"Upload and deploy" del dashboard (Workers + Static Assets: `_worker.js` hace de
backend y sirve `index.html`/`style.css`/`app.js` como archivos estaticos, sin
necesitar servidor Node corriendo 24/7).

> Nota: si usas el flujo **Create a Worker -> Upload and deploy**, esta carpeta
> funciona tal cual (usa `_worker.js`, no `functions/`, porque ese dashboard no
> soporta Pages Functions). Si en cambio creas un proyecto de **Pages** clasico
> (Workers & Pages -> Pages -> Upload assets), tambien funciona igual: Pages
> detecta `_worker.js` como Advanced Mode y lo usa como backend completo.

## Como ahorra creditos

1. **Cache en Supabase**: si dos personas (o la misma) piden el mismo prompt con el
   mismo modelo, la segunda vez se sirve la imagen guardada — cero llamadas nuevas a
   OpenRouter.
2. **Limite diario**: por defecto 30 generaciones nuevas por dia (variable
   `DAILY_LIMIT`). Pasado ese limite, la app responde con un error en vez de seguir
   gastando creditos.
3. **Modelo por defecto barato**: `google/gemini-2.5-flash-image-preview`
   (aprox. $0.04 USD por imagen en OpenRouter — revisa el precio actualizado en
   https://openrouter.ai/models antes de usarlo mucho).

## Pasos para desplegar

1. En el dashboard de Cloudflare entra a **Workers & Pages** -> **Create**.
   - Si te aparece la opcion **"Import an existing repository"** vs
     **"Deploy manually" / "Upload assets"**, elige la de subida manual/directa.
   - Si te lleva al flujo nuevo **"Create a Worker" -> "Upload and deploy"**,
     tambien sirve: sube el mismo contenido ahi.
2. Arrastra el contenido de esta carpeta (o descomprime el .zip y arrastra los
   archivos): `index.html`, `style.css`, `app.js`, `_worker.js` deben quedar en
   la **raiz** del proyecto (no dentro de una subcarpeta).
3. Ponle un nombre al Worker/proyecto y dale a **Deploy**.
4. Una vez creado, ve a **Settings -> Variables and Secrets** (o
   "Environment variables" en Pages clasico) y agrega estas 4 variables (marca
   "Encrypt"/"Secret" si el dashboard lo ofrece):

   | Variable | Valor |
   |---|---|
   | `OPENROUTER_API_KEY` | tu api key de OpenRouter (la que ya me diste en el chat) |
   | `SUPABASE_URL` | `https://kelkiiluajgabsaflubk.supabase.co` |
   | `SUPABASE_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtlbGtpaWx1YWpnYWJzYWZsdWJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1NDMxOTgsImV4cCI6MjA5NDExOTE5OH0.p6MtP4aC17XdVeMoIifr6e3-jYh1aAdIxN7yDTCe66E` |
   | `DAILY_LIMIT` | `30` (opcional, es el tope de generaciones nuevas por dia) |

   `SUPABASE_URL`/`SUPABASE_KEY` ya apuntan a un proyecto Supabase real y activo,
   con las tablas de cache creadas. Es la `anon` key, protegida con RLS para que
   solo pueda leer/escribir esas dos tablas de cache (no expone nada mas del
   proyecto), asi que es segura de usar aqui.

   **Importante sobre `OPENROUTER_API_KEY`**: la pegaste en el chat, asi que quedo
   expuesta en ese historial. Te recomendamos regenerarla en openrouter.ai y usar
   la nueva key aqui.

5. Vuelve a desplegar (Cloudflare re-despliega solo al guardar las variables, o
   puedes forzar un redeploy desde el dashboard, pestaña "Deployments").

Si no configuras las variables de Supabase, la app sigue funcionando (solo se
pierde el cache y el limite diario, cada request llama directo a OpenRouter).

## Base de datos (Supabase)

El proyecto Supabase (`ai-chat-openrouter`, ya existente en tu cuenta) tiene las
tablas `generations` y `api_usage`, y la funcion `increment_usage`, creadas via
migracion. Si necesitas recrearlas en otro proyecto, el SQL esta en
`supabase_schema.sql` en esta misma carpeta (incluye los `grant`/`policy` para
que la anon key pueda usarlas).
