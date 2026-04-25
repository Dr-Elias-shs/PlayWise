import { NextRequest } from 'next/server';
import { getOllamaBase } from '@/lib/ollamaBase';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const base = await getOllamaBase();

  let upstream: Response;
  try {
    upstream = await fetch(`${base}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    return new Response(JSON.stringify({ error: 'Ollama not reachable' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Stream the response straight through
  return new Response(upstream.body, {
    status: upstream.status,
    headers: { 'Content-Type': 'application/x-ndjson' },
  });
}
