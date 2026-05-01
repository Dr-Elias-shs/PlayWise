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

// GET /api/characters/upload?path=/characters/xxx/walk1.png
// → returns a signed upload URL (using service role key, bypasses RLS)
// GET /api/characters/upload (no path)
// → diagnostics
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const filePath = searchParams.get('path');

  if (filePath) {
    if (!filePath.startsWith('/characters/')) {
      return NextResponse.json({ error: 'Path must start with /characters/' }, { status: 400 });
    }
    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json({ error: 'Missing service key env var' }, { status: 500 });
    }
    const storagePath = filePath.replace(/^\/characters\//, '');
    const { data, error } = await supabase.storage
      .from('characters')
      .createSignedUploadUrl(storagePath);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ token: data.token, path: storagePath });
  }

  // Diagnostics
  const url  = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key  = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;
  let result = '';
  if (!url || !key) {
    result = `FAIL: missing env vars — url=${!!url} serviceKey=${!!key}`;
  } else {
    try {
      const supabase = createClient(url, key);
      const { data, error } = await supabase.storage.from('characters').list('', { limit: 1 });
      if (error) result = `FAIL: ${error.message}`;
      else result = `OK: bucket accessible, ${data?.length ?? 0} top-level items`;
    } catch (e) {
      result = `FAIL: ${String(e)}`;
    }
  }
  return new Response(`<pre style="font:16px monospace;padding:20px">${result}</pre>`, {
    headers: { 'content-type': 'text/html' },
  });
}
