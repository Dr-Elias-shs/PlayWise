import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  // Strip all whitespace from the key — prevents broken JWT if pasted with line breaks
  const key = process.env.SUPABASE_SERVICE_KEY?.replace(/\s/g, '');
  if (!url || !key) {
    throw new Error('SUPABASE_SERVICE_KEY is not configured on this server.');
  }
  return createClient(url, key);
}

function err(msg: string, status = 400) {
  return new Response(JSON.stringify({ error: msg }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function ok(body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

// POST — insert one or many questions
export async function POST(req: NextRequest) {
  try {
    const admin = getAdmin();
    const body = await req.json() as { rows: unknown[] };
    if (!Array.isArray(body.rows) || body.rows.length === 0) {
      return err('rows must be a non-empty array');
    }
    const { data, error } = await admin
      .from('trivia_questions')
      .insert(body.rows)
      .select('id');
    if (error) return err(error.message);
    return ok({ inserted: (data ?? []).length });
  } catch (e) {
    console.error('[trivia-admin POST]', e);
    return err(String(e), 500);
  }
}

// PATCH — update one question by id
export async function PATCH(req: NextRequest) {
  try {
    const admin = getAdmin();
    const { id, updates } = await req.json() as { id: string; updates: Record<string, unknown> };
    if (!id) return err('id is required');
    const { error } = await admin.from('trivia_questions').update(updates).eq('id', id);
    if (error) return err(error.message);
    return ok({ ok: true });
  } catch (e) {
    console.error('[trivia-admin PATCH]', e);
    return err(String(e), 500);
  }
}

// DELETE — delete one question by id
export async function DELETE(req: NextRequest) {
  try {
    const admin = getAdmin();
    const { id } = await req.json() as { id: string };
    if (!id) return err('id is required');
    const { error } = await admin.from('trivia_questions').delete().eq('id', id);
    if (error) return err(error.message);
    return ok({ ok: true });
  } catch (e) {
    console.error('[trivia-admin DELETE]', e);
    return err(String(e), 500);
  }
}
