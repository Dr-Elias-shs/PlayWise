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

export async function GET() {
  const url  = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key  = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  let result = '';
  if (!url || !key) {
    result = `FAIL: missing env vars — url=${!!url} serviceKey=${!!key} anonKey=${!!anon}`;
  } else {
    try {
      const supabase = createClient(url, key);
      const { data, error } = await supabase.storage.from('characters').list('', { limit: 1 });
      if (error) result = `FAIL: bucket list error — ${error.message}`;
      else result = `OK: bucket accessible, ${data?.length ?? 0} top-level items`;
    } catch (e) {
      result = `FAIL: exception — ${String(e)}`;
    }
  }

  return new Response(`<pre style="font:16px monospace;padding:20px">${result}</pre>`, {
    headers: { 'content-type': 'text/html' },
  });
}

export async function POST(req: NextRequest) {
  try {
    const form     = await req.formData();
    const file     = form.get('file')  as File   | null;
    const filePath = form.get('path')  as string | null;

    if (!file || !filePath) {
      return NextResponse.json({ error: 'Missing file or path' }, { status: 400 });
    }
    if (!filePath.startsWith('/characters/')) {
      return NextResponse.json({ error: 'Path must start with /characters/' }, { status: 400 });
    }

    const bytes = Buffer.from(await file.arrayBuffer());

    // Dev: write to local filesystem
    if (process.env.NODE_ENV === 'development') {
      const { join, dirname } = await import('path');
      const { mkdir, writeFile } = await import('fs/promises');
      const fullPath = join(process.cwd(), 'public', filePath);
      await mkdir(dirname(fullPath), { recursive: true });
      await writeFile(fullPath, bytes);
      return NextResponse.json({ ok: true, path: filePath });
    }

    // Prod: Supabase Storage (service role key bypasses RLS)
    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY / SUPABASE_SERVICE_KEY' },
        { status: 500 },
      );
    }

    // Strip /characters/ prefix — bucket is already named 'characters'
    const storagePath = filePath.replace(/^\/characters\//, '');

    const { error } = await supabase.storage
      .from('characters')
      .upload(storagePath, bytes, { contentType: file.type || 'image/png', upsert: true });

    if (error) {
      return NextResponse.json({ error: `Storage upload failed: ${error.message}` }, { status: 500 });
    }

    const { data: { publicUrl } } = supabase.storage.from('characters').getPublicUrl(storagePath);
    return NextResponse.json({ ok: true, path: publicUrl });

  } catch (e) {
    console.error('[upload] unhandled error:', e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
