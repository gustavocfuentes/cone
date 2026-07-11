const promptEl = document.getElementById('prompt');
const modelEl = document.getElementById('model');
const btn = document.getElementById('generateBtn');
const statusEl = document.getElementById('status');
const imageWrap = document.getElementById('imageWrap');

async function loadModels() {
  try {
    const res = await fetch('/api/models');
    const data = await res.json();
    modelEl.innerHTML = '';
    for (const m of data.models) {
      const opt = document.createElement('option');
      opt.value = m.id;
      opt.textContent = m.label || m.id;
      modelEl.appendChild(opt);
    }
  } catch {
    modelEl.innerHTML = '<option value="google/gemini-2.5-flash-image-preview">Gemini 2.5 Flash Image</option>';
  }
}

function setStatus(text, kind) {
  statusEl.textContent = text;
  statusEl.classList.remove('error', 'cached');
  if (kind) statusEl.classList.add(kind);
}

async function generate() {
  const prompt = promptEl.value.trim();
  if (!prompt) {
    setStatus('Escribe un prompt primero.', 'error');
    return;
  }

  btn.disabled = true;
  imageWrap.innerHTML = '<div class="spinner"></div>';
  setStatus('Generando imagen, esto puede tardar unos segundos...');

  try {
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, model: modelEl.value }),
    });
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Error desconocido');
    }

    imageWrap.innerHTML = '';
    setStatus(
      data.cached ? 'Imagen servida desde cache (0 creditos usados)' : `Imagen generada (modelo: ${data.model})`,
      data.cached ? 'cached' : undefined
    );

    for (const url of data.images) {
      const img = document.createElement('img');
      img.src = url;
      imageWrap.appendChild(img);

      const link = document.createElement('a');
      link.href = url;
      link.download = 'imagen-generada.png';
      link.textContent = 'Descargar imagen';
      link.className = 'download-link';
      imageWrap.appendChild(link);
    }
  } catch (err) {
    imageWrap.innerHTML = '';
    setStatus(err.message, 'error');
  } finally {
    btn.disabled = false;
  }
}

btn.addEventListener('click', generate);
promptEl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
    generate();
  }
});

loadModels();
