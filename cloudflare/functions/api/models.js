export async function onRequestGet() {
  const models = [
    { id: 'google/gemini-2.5-flash-image-preview', label: 'Gemini 2.5 Flash Image (~$0.04/imagen)' },
  ];
  return new Response(JSON.stringify({ models }), {
    headers: { 'Content-Type': 'application/json' },
  });
}
