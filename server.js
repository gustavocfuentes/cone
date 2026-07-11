require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

const MODELS = [
  'google/gemini-2.5-flash-image',
  'google/gemini-2.5-flash-image-preview',
  'google/gemini-2.5-flash-image-preview:free',
];

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/generate', async (req, res) => {
  if (!OPENROUTER_API_KEY) {
    return res.status(500).json({ error: 'Falta configurar OPENROUTER_API_KEY en el archivo .env del servidor.' });
  }

  const { prompt, model } = req.body || {};
  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    return res.status(400).json({ error: 'El prompt no puede estar vacio.' });
  }

  const chosenModel = MODELS.includes(model) ? model : MODELS[0];

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost',
        'X-Title': 'Cone Image Generator',
      },
      body: JSON.stringify({
        model: chosenModel,
        messages: [{ role: 'user', content: prompt }],
        modalities: ['image', 'text'],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      const message = data?.error?.message || 'Error al llamar a OpenRouter.';
      return res.status(response.status).json({ error: message });
    }

    const message = data?.choices?.[0]?.message;
    const images = (message?.images || [])
      .map((img) => img?.image_url?.url)
      .filter(Boolean);

    if (images.length === 0) {
      return res.status(502).json({
        error: 'El modelo no devolvio ninguna imagen. Intenta con otro prompt o modelo.',
        raw: message?.content || null,
      });
    }

    res.json({ images, model: chosenModel });
  } catch (err) {
    res.status(500).json({ error: `Error de conexion con OpenRouter: ${err.message}` });
  }
});

app.get('/api/models', (_req, res) => {
  res.json({ models: MODELS });
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
