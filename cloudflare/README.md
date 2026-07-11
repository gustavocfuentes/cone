# Generador de imagenes — version Cloudflare Pages

Esta carpeta es un sitio listo para subir a **Cloudflare Pages** (frontend estatico +
Pages Functions que hacen de backend, sin necesidad de un servidor Node corriendo 24/7).

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

1. Entra a el dashboard de Cloudflare -> **Workers & Pages** -> **Create** -> **Pages**
   -> **Upload assets** (subida directa, sin Git).
2. Sube el contenido de esta carpeta (o el .zip ya generado) tal cual: `index.html`,
   `style.css`, `app.js` y la carpeta `functions/` deben quedar en la raiz del
   proyecto.
3. Una vez creado el proyecto, ve a **Settings -> Environment variables** y agrega
   estas 4 variables (marca "Encrypt" si el dashboard lo ofrece):

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

4. Vuelve a desplegar (Cloudflare re-despliega solo al guardar las variables, o
   puedes forzar un redeploy desde el dashboard, pestaña "Deployments").

Si no configuras las variables de Supabase, la app sigue funcionando (solo se
pierde el cache y el limite diario, cada request llama directo a OpenRouter).

## Base de datos (Supabase)

El proyecto Supabase (`ai-chat-openrouter`, ya existente en tu cuenta) tiene las
tablas `generations` y `api_usage`, y la funcion `increment_usage`, creadas via
migracion. Si necesitas recrearlas en otro proyecto, el SQL esta en
`supabase_schema.sql` en esta misma carpeta (incluye los `grant`/`policy` para
que la anon key pueda usarlas).
