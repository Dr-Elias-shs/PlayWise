/**
 * Uploads character/outfit images.
 * - Dev (localhost): writes directly to public/ filesystem (fast, no setup needed)
 * - Prod (Render etc.): uploads to Supabase Storage bucket "characters" (public bucket)
 *
 * One-time Supabase setup for prod:
 *   1. Storage → New bucket → name "characters" → Public ✓
 *   2. Render env var: SUPABASE_SERVICE_ROLE_KEY  (from Supabase → Settings → API)
 */

import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { createClient } from '@supabase/supabase-js';

const isDev = process.env.NODE_ENV === 'development';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export async function POST(req: NextRequest) {
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

  // ── Dev: write to local public/ ──────────────────────────────────────────
  if (isDev) {
    const fullPath = path.join(process.cwd(), 'public', filePath);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, bytes);
    return NextResponse.json({ ok: true, path: filePath });
  }

  // ── Prod: Supabase Storage ────────────────────────────────────────────────
  const storagePath = filePath.slice(1); // strip leading /

  const { error } = await supabase.storage
    .from('characters')
    .upload(storagePath, bytes, {
      contentType: file.type || 'image/png',
      upsert: true,
    });

  if (error) {
    return NextResponse.json(
      { error: `Storage upload failed: ${error.message}. Create a public "characters" bucket in Supabase and set SUPABASE_SERVICE_ROLE_KEY on Render.` },
      { status: 500 },
    );
  }

  const { data: { publicUrl } } = supabase.storage
    .from('characters')
    .getPublicUrl(storagePath);

  return NextResponse.json({ ok: true, path: publicUrl });
}
