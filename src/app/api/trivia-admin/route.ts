import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
);

// POST — insert one or many questions
export async function POST(req: NextRequest) {
  const body = await req.json() as { rows: unknown[] };
  const { data, error } = await supabaseAdmin
    .from('trivia_questions')
    .insert(body.rows)
    .select('id');
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ inserted: (data ?? []).length });
}

// PATCH — update one question by id
export async function PATCH(req: NextRequest) {
  const { id, updates } = await req.json() as { id: string; updates: unknown };
  const { error } = await supabaseAdmin
    .from('trivia_questions')
    .update(updates as Record<string, unknown>)
    .eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

// DELETE — delete one question by id
export async function DELETE(req: NextRequest) {
  const { id } = await req.json() as { id: string };
  const { error } = await supabaseAdmin
    .from('trivia_questions')
    .delete()
    .eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
