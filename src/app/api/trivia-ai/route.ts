// Trivia AI generation is handled client-side via /api/ollama/generate
// (same pattern as curriculum). This route is unused.
export async function POST() {
  return new Response(JSON.stringify({ error: 'Use Ollama directly via /api/ollama/generate' }), {
    status: 410,
    headers: { 'Content-Type': 'application/json' },
  });
}
