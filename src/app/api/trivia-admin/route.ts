import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error('SUPABASE_SERVICE_KEY is not configured on this server.');
  return createClient(url, key);
}

// POST — insert one or many questions
export async function POST(req: NextRequest) {
  try {
    const admin = getAdmin();
    const body = await req.json() as { rows: unknown[] };
    const { data, error } = await admin.from('trivia_questions').insert(body.rows).select('id');
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ inserted: (data ?? []).length });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 503 });
  }
}

// PATCH — update one question by id
export async function PATCH(req: NextRequest) {
  try {
    const admin = getAdmin();
    const { id, updates } = await req.json() as { id: string; updates: Record<string, unknown> };
    const { error } = await admin.from('trivia_questions').update(updates).eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 503 });
  }
}

// DELETE — delete one question by id
export async function DELETE(req: NextRequest) {
  try {
    const admin = getAdmin();
    const { id } = await req.json() as { id: string };
    const { error } = await admin.from('trivia_questions').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 503 });
  }
}
