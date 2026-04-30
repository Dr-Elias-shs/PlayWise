/**
 * Supabase Storage bucket setup (run once in Supabase dashboard):
 *   1. Create a bucket named "characters" and set it to Public.
 *   2. Add a storage policy allowing INSERT for the service role (or anon if using anon key).
 *
 * Required env var (server-side): SUPABASE_SERVICE_ROLE_KEY
 * Falls back to NEXT_PUBLIC_SUPABASE_ANON_KEY if not set (needs permissive bucket policy).
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

  const storagePath = filePath.slice(1); // "characters/outfits/sako/male.png"
  const bytes = Buffer.from(await file.arrayBuffer());

  const { error } = await supabase.storage
    .from('characters')
    .upload(storagePath, bytes, {
      contentType: file.type || 'image/png',
      upsert: true,
    });

  if (error) {
    return NextResponse.json(
      { error: `Storage upload failed: ${error.message}. Make sure the "characters" bucket exists and is public in Supabase.` },
      { status: 500 },
    );
  }

  const { data: { publicUrl } } = supabase.storage
    .from('characters')
    .getPublicUrl(storagePath);

  return NextResponse.json({ ok: true, path: publicUrl });
}
