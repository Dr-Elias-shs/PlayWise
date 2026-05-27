import { NextRequest } from 'next/server';

export async function GET(_req: NextRequest, { params }: { params: { word: string } }) {
  const word = encodeURIComponent(params.word.toLowerCase());
  try {
    const upstream = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`, {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 86400 }, // cache 24h on the server
    });
    const body = await upstream.text();
    return new Response(body, {
      status: upstream.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ message: 'upstream unreachable' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
