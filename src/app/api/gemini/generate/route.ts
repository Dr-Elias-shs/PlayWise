import { NextRequest } from 'next/server';

export const runtime = 'nodejs';

// Helper — use a plain Response (NextResponse.json breaks under this project's
// custom-server transpile: "Class constructor _Response cannot be invoked…").
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// POST /api/gemini/generate  { prompt: string, temperature?: number }
//   → { text: string }   (the model's raw response, expected to be a JSON array)
//
// Server-side proxy to Google Gemini (same key/model as the shsai project).
// The API key never reaches the browser. Returns 503 when no key is configured
// so the caller can fall back to the local Ollama model.
export async function POST(req: NextRequest) {
  const { prompt, temperature = 0.3 } = await req.json().catch(() => ({}));
  if (!prompt || typeof prompt !== 'string') {
    return json({ error: 'missing_prompt' }, 400);
  }

  const key   = process.env.GEMINI_API_KEY?.trim();
  const model = (process.env.GEMINI_MODEL || 'gemini-2.5-flash').trim();
  if (!key) return json({ error: 'no_gemini_key' }, 503);

  try {
    const upstream = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature,
            responseMimeType: 'application/json',
            maxOutputTokens: 8192,
          },
        }),
      },
    );

    if (!upstream.ok) {
      const detail = (await upstream.text().catch(() => '')).slice(0, 300);
      return json({ error: `gemini_${upstream.status}`, detail }, 502);
    }

    const data = await upstream.json();
    const text: string =
      data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? '').join('') ?? '';
    if (!text) return json({ error: 'gemini_empty' }, 502);

    return json({ text });
  } catch (e) {
    return json({ error: 'gemini_unreachable', detail: e instanceof Error ? e.message : String(e) }, 502);
  }
}
