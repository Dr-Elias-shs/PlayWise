import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const maxDuration = 30;

// POST /api/characters/upload?p=relPath
// Body: raw file bytes, Content-Type header set to the file's MIME type
export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const relPath = searchParams.get('p');
  if (!relPath) return NextResponse.json({ error: 'Missing ?p= path param' }, { status: 400 });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY
                   ?? process.env.SUPABASE_SERVICE_KEY
                   ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'Missing env vars' }, { status: 500 });
  }

  try {
    const contentType = req.headers.get('content-type') || 'image/png';
    const buffer      = await req.arrayBuffer();

    // Upload directly via Supabase Storage REST API (bypasses storage-js, shows raw errors)
    const uploadUrl = `${supabaseUrl}/storage/v1/object/characters/${relPath}`;
    const uploadRes = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        Authorization:  `Bearer ${serviceKey}`,
        'Content-Type': contentType,
        'x-upsert':     'true',
      },
      body: buffer,
    });

    if (!uploadRes.ok) {
      const errText = await uploadRes.text().catch(() => '(no body)');
      return NextResponse.json(
        { error: `Supabase storage ${uploadRes.status}: ${errText}` },
        { status: 500 },
      );
    }

    const publicUrl = `${supabaseUrl}/storage/v1/object/public/characters/${relPath}`;
    return NextResponse.json({ publicUrl, path: relPath });
  } catch (e) {
    console.error('[upload POST]', e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// GET /api/characters/upload → diagnostics incl. write test
export async function GET(_req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;

  let result = '';
  if (!supabaseUrl || !serviceKey) {
    result = `FAIL: missing env — url=${!!supabaseUrl} key=${!!serviceKey}`;
  } else {
    try {
      const supabase = createClient(supabaseUrl, serviceKey);
      // Read test
      const { data, error: listErr } = await supabase.storage.from('characters').list('', { limit: 1 });
      if (listErr) { result = `FAIL read: ${listErr.message}`; }
      else {
        result = `read OK (${data?.length ?? 0} items). `;
        // Write test — 1×1 transparent PNG
        const tiny = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
        const writeRes = await fetch(`${supabaseUrl}/storage/v1/object/characters/_diag_test.png`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'image/png', 'x-upsert': 'true' },
          body: tiny,
        });
        if (!writeRes.ok) {
          const body = await writeRes.text().catch(() => '');
          result += `FAIL write (${writeRes.status}): ${body}`;
        } else {
          result += `write OK`;
        }
      }
    } catch (e) {
      result = `FAIL exception: ${String(e)}`;
    }
  }
  return new Response(`<pre style="font:16px monospace;padding:20px">${result}</pre>`, {
    headers: { 'content-type': 'text/html', 'cache-control': 'no-store' },
  });
}
