import { NextRequest } from 'next/server';

// Plain Response, never NextResponse: under PlayWise's custom server NextResponse
// throws "Class constructor _Response cannot be invoked without 'new'", which made
// every sprite request crash (about 60 a day in Sept 2026).
const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

export const runtime = 'nodejs';

// Server-side in-memory cache. Each entry is held for MEM_TTL_MS after first fetch.
// A typical sprite PNG is 30–200 KB. With ~100 sprites worst case this peaks at ~20 MB.
const MEM_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

interface CachedSprite {
  buffer:      ArrayBuffer;
  contentType: string;
  cachedAt:    number;
}

const memCache = new Map<string, CachedSprite>();

// GET /api/sprite/<id>/<file>   →   binary image
//
// Proxies a sprite stored in the Supabase Storage "characters" bucket. The first
// request per server process fetches from Supabase; subsequent requests serve
// from RAM. We set a 1-year immutable Cache-Control header so browsers and any
// upstream CDN cache the image essentially forever.
export async function GET(_req: NextRequest, { params }: { params: { path: string[] } }) {
  const relPath = params.path.join('/');
  if (!relPath) return json({ error: 'No path' }, 400);

  // ── Serve from memory if fresh ────────────────────────────────────────────
  const cached = memCache.get(relPath);
  if (cached && (Date.now() - cached.cachedAt) < MEM_TTL_MS) {
    return new Response(cached.buffer, {
      headers: {
        'Content-Type':  cached.contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Sprite-Cache': 'HIT',
      },
    });
  }

  // ── Cache miss → fetch from Supabase Storage ──────────────────────────────
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return json({ error: 'Missing SUPABASE_URL' }, 500);

  const upstreamUrl = `${supabaseUrl}/storage/v1/object/public/characters/${relPath}`;
  const upstream    = await fetch(upstreamUrl);
  if (!upstream.ok) {
    return json({ error: `Upstream ${upstream.status}` }, upstream.status);
  }

  const buffer      = await upstream.arrayBuffer();
  const contentType = upstream.headers.get('content-type') ?? 'image/png';

  memCache.set(relPath, { buffer, contentType, cachedAt: Date.now() });

  return new Response(buffer, {
    headers: {
      'Content-Type':  contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Sprite-Cache': 'MISS',
    },
  });
}
