import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import fs from 'fs/promises';

const LOCAL_PATH = path.join(process.cwd(), 'public', 'characters', 'registry.json');

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function GET() {
  try {
    const supabase = getSupabase();
    if (supabase) {
      const { data } = await supabase
        .from('global_config')
        .select('value')
        .eq('key', 'character_registry')
        .maybeSingle();
      if (data?.value) return NextResponse.json(data.value);
    }
  } catch { /* fall through to static file */ }

  try {
    const raw = await fs.readFile(LOCAL_PATH, 'utf-8');
    return NextResponse.json(JSON.parse(raw));
  } catch {
    return NextResponse.json({ characters: [], outfits: [] });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const supabase = getSupabase();

    if (supabase) {
      await supabase.from('global_config').upsert(
        { key: 'character_registry', value: body },
        { onConflict: 'key' },
      );
    }

    try {
      await fs.mkdir(path.dirname(LOCAL_PATH), { recursive: true });
      await fs.writeFile(LOCAL_PATH, JSON.stringify(body, null, 2));
    } catch { /* read-only fs in prod */ }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('POST /api/characters error:', e);
    return NextResponse.json({ error: 'Failed to save registry' }, { status: 500 });
  }
}
