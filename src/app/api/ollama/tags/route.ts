import { NextResponse } from 'next/server';
import { getOllamaBase } from '@/lib/ollamaBase';

export async function GET() {
  const base = await getOllamaBase();
  try {
    const r = await fetch(`${base}/api/tags`, { cache: 'no-store' });
    const data = await r.json();
    return NextResponse.json(data, { status: r.status });
  } catch {
    return NextResponse.json({ error: 'Ollama not reachable' }, { status: 502 });
  }
}
