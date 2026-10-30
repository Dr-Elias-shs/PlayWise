import { getOllamaBase } from '@/lib/ollamaBase';

export const dynamic = 'force-dynamic';

// Plain Response, never NextResponse: NextResponse throws under PlayWise's custom server.
const json = (body: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(body), { ...init, headers: { 'Content-Type': 'application/json' } });

export async function GET() {
  const base = await getOllamaBase();
  try {
    const r = await fetch(`${base}/api/tags`, { cache: 'no-store' });
    const data = await r.json();
    return json(data, { status: r.status });
  } catch {
    return json({ error: 'Ollama not reachable' }, { status: 502 });
  }
}
