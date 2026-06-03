import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const maxDuration = 30;

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

// POST /api/characters/upload?p=relPath
// Body: raw file bytes, Content-Type header set to the file's MIME type
// → uploads directly to Supabase Storage via service role (no signed URLs needed)
export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const relPath = searchParams.get('p');
  if (!relPath) return NextResponse.json({ error: 'Missing ?p= path param' }, { status: 400 });

  try {
    const supabase = getSupabase();
    if (!supabase) return NextResponse.json({ error: 'Missing service key env var' }, { status: 500 });

    const contentType = req.headers.get('content-type') || 'image/png';
    const buffer = Buffer.from(new Uint8Array(await req.arrayBuffer()));

    const { error } = await supabase.storage
      .from('characters')
      .upload(relPath, buffer, { contentType, upsert: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const { data: { publicUrl } } = supabase.storage.from('characters').getPublicUrl(relPath);
    return NextResponse.json({ publicUrl, path: relPath });
  } catch (e) {
    console.error('[upload POST] error:', e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// GET /api/characters/upload (no params) → diagnostics
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  if (searchParams.get('p')) {
    return NextResponse.json(
      { error: 'GET upload is no longer supported — use POST instead' },
      { status: 405 }
    );
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;
  let result = '';
  if (!url || !key) {
    result = `FAIL: missing env vars — url=${!!url} serviceKey=${!!key}`;
  } else {
    try {
      const supabase = createClient(url, key);
      const { data, error } = await supabase.storage.from('characters').list('', { limit: 1 });
      if (error) result = `FAIL: ${error.message}`;
      else result = `OK v8: bucket accessible, ${data?.length ?? 0} top-level items`;
    } catch (e) {
      result = `FAIL: ${String(e)}`;
    }
  }
  return new Response(`<pre style="font:16px monospace;padding:20px">${result}</pre>`, {
    headers: { 'content-type': 'text/html' },
  });
}
