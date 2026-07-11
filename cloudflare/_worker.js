const MODELS = ['google/gemini-2.5-flash-image-preview'];

export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);

      if (url.pathname === '/api/models' && request.method === 'GET') {
        return handleModels();
      }

      if (url.pathname === '/api/generate' && request.method === 'POST') {
        return await handleGenerate(request, env);
      }

      return env.ASSETS.fetch(request);
    } catch (err) {
      // cualquier error no controlado devuelve JSON en vez de un body vacio
      return json({ error: `Error interno del Worker: ${err.message || err}` }, 500);
    }
  },
};

async function handleModels() {
  const models = [
    { id: 'google/gemini-2.5-flash-image-preview', label: 'Gemini 2.5 Flash Image (~$0.04/imagen)' },
  ];
  return json({ models });
}

async function handleGenerate(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'JSON invalido en la peticion.' }, 400);
  }

  const prompt = String(body?.prompt || '').trim();
  const model = MODELS.includes(body?.model) ? body.model : MODELS[0];

  if (!prompt) {
    return json({ error: 'El prompt no puede estar vacio.' }, 400);
  }

  const OPENROUTER_API_KEY = env.OPENROUTER_API_KEY;
  if (!OPENROUTER_API_KEY) {
    return json({ error: 'Falta configurar la variable de entorno OPENROUTER_API_KEY en el Worker.' }, 500);
  }

  const supa = supabaseClient(env);
  const promptHash = await sha256(`${model}::${prompt.toLowerCase()}`);
  const dailyLimit = Number(env.DAILY_LIMIT || 30);

  // 1. Devolver desde cache si ya se genero antes el mismo prompt+modelo (0 creditos).
  if (supa) {
    try {
      const cached = await supa(
        `/rest/v1/generations?prompt_hash=eq.${promptHash}&select=image_data,model&limit=1`
      );
      if (Array.isArray(cached) && cached.length > 0) {
        return json({ images: [cached[0].image_data], model: cached[0].model, cached: true });
      }
    } catch {
      // si el cache falla, seguimos e intentamos generar igual
    }
  }

  // 2. Limite diario para no disparar el gasto de creditos por error o abuso.
  if (supa) {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const result = await supa('/rest/v1/rpc/increment_usage', 'POST', { usage_day: today });
      const count = typeof result === 'number' ? result : Array.isArray(result) ? result[0] : null;
      if (typeof count === 'number' && count > dailyLimit) {
        return json(
          { error: `Limite diario de ${dailyLimit} imagenes alcanzado. Vuelve manana para cuidar los creditos de la API.` },
          429
        );
      }
    } catch {
      // si el contador falla, no bloqueamos la generacion
    }
  }

  // 3. Llamar a OpenRouter.
  let data;
  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': request.headers.get('origin') || 'https://workers.dev',
        'X-Title': 'Cone Image Generator',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        modalities: ['image', 'text'],
      }),
    });
    data = await response.json();
    if (!response.ok) {
      const message = data?.error?.message || 'Error al llamar a OpenRouter.';
      return json({ error: message }, response.status);
    }
  } catch (err) {
    return json({ error: `Error de conexion con OpenRouter: ${err.message}` }, 500);
  }

  const message = data?.choices?.[0]?.message;
  const images = (message?.images || []).map((img) => img?.image_url?.url).filter(Boolean);

  if (images.length === 0) {
    return json({ error: 'El modelo no devolvio ninguna imagen. Intenta con otro prompt.' }, 502);
  }

  // 4. Guardar en cache para que el mismo prompt no vuelva a cobrar creditos.
  if (supa) {
    try {
      await supa('/rest/v1/generations?on_conflict=prompt_hash', 'POST',
        { prompt_hash: promptHash, prompt, model, image_data: images[0] },
        { Prefer: 'resolution=ignore-duplicates,return=minimal' }
      );
    } catch {
      // no bloquear la respuesta si falla el guardado en cache
    }
  }

  return json({ images, model, cached: false });
}

function supabaseClient(env) {
  const url = env.SUPABASE_URL;
  const key = env.SUPABASE_KEY;
  if (!url || !key) return null;

  return async (pathAndQuery, method = 'GET', body, extraHeaders = {}) => {
    const res = await fetch(`${url}${pathAndQuery}`, {
      method,
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        ...extraHeaders,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      throw new Error(`Supabase error ${res.status}: ${await res.text()}`);
    }
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  };
}

async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
