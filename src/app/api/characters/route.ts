import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import fs from 'fs/promises';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

const LOCAL_PATH = path.join(process.cwd(), 'public', 'characters', 'registry.json');

export async function GET() {
  // Primary: Supabase global_config
  try {
    const { data } = await supabase
      .from('global_config')
      .select('value')
      .eq('key', 'character_registry')
      .maybeSingle();
    if (data?.value) return NextResponse.json(data.value);
  } catch { /* fall through */ }

  // Fallback: static file (initial deploy / dev)
  try {
    const raw = await fs.readFile(LOCAL_PATH, 'utf-8');
    return NextResponse.json(JSON.parse(raw));
  } catch {
    return NextResponse.json({ characters: [], outfits: [] });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  // Write to Supabase (works in prod)
  await supabase.from('global_config').upsert(
    { key: 'character_registry', value: body, updated_at: new Date().toISOString() },
    { onConflict: 'key' },
  );

  // Also write local file (dev convenience — silently ignored if read-only)
  try {
    await fs.mkdir(path.dirname(LOCAL_PATH), { recursive: true });
    await fs.writeFile(LOCAL_PATH, JSON.stringify(body, null, 2));
  } catch { /* read-only fs in prod */ }

  return NextResponse.json({ ok: true });
}
