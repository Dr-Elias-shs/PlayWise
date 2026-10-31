// POST /api/questions — staff edits to the Trivia and Spelling Bee banks.
// The browser key can no longer write these tables. Anything added or edited here
// is 'pending' and stays hidden from students until approved in Wisely
// (PlayWise Questions page). Body: { bank: 'trivia' | 'spelling', op, ... }.
import { readSession, json } from '@/lib/server/session';
import { db } from '@/lib/server/db';
import { SPELLING_BEE_DEFAULTS } from '@/lib/spellingBee';

export const dynamic = 'force-dynamic';

const TRIVIA_FIELDS = ['question', 'options', 'correct_index', 'category', 'grade', 'difficulty', 'source', 'explanation'] as const;

function triviaRow(q: Record<string, unknown>) {
  const row: Record<string, unknown> = {};
  for (const k of TRIVIA_FIELDS) if (q[k] !== undefined) row[k] = q[k];
  return row;
}
const PENDING = { status: 'pending', reviewed_by: null, reviewed_at: null };

export async function POST(req: Request) {
  const s = readSession(req);
  if (!s || !(s.isStaff || s.isAdmin)) return json({ error: 'Staff only' }, { status: 403 });
  let b: Record<string, any>;
  try { b = await req.json(); } catch { return json({ error: 'Bad request' }, { status: 400 }); }
  const sb = db();

  if (b.bank === 'trivia') {
    const t = sb.from('trivia_questions');
    switch (b.op) {
      case 'insert': {
        const { data, error } = await t.insert({ ...triviaRow(b.question), ...PENDING }).select().single();
        return error ? json({ error: error.message }, { status: 500 }) : json(data);
      }
      case 'bulk': {
        const rows = (Array.isArray(b.questions) ? b.questions : []).slice(0, 500)
          .map((q: Record<string, unknown>) => ({ ...triviaRow(q), ...PENDING }));
        let total = 0;
        for (let i = 0; i < rows.length; i += 50) {
          const { data, error } = await sb.from('trivia_questions').insert(rows.slice(i, i + 50)).select('id');
          if (error) return json({ error: error.message, inserted: total }, { status: 500 });
          total += data?.length ?? 0;
        }
        return json({ inserted: total });
      }
      case 'update': {
        // Any edit sends the question back to review.
        const { error } = await t.update({ ...triviaRow(b.question), ...PENDING }).eq('id', b.id);
        return error ? json({ error: error.message }, { status: 500 }) : json({ ok: true });
      }
      case 'delete': {
        const { error } = await t.delete().eq('id', b.id);
        return error ? json({ error: error.message }, { status: 500 }) : json({ ok: true });
      }
      case 'clear': {
        if (!s.isAdmin) return json({ error: 'Admins only' }, { status: 403 });
        const { error } = await t.delete().not('id', 'is', null);
        return error ? json({ error: error.message }, { status: 500 }) : json({ ok: true });
      }
    }
  }

  if (b.bank === 'spelling') {
    const grade = Number(b.grade);
    const clean = (w: unknown) => String(w ?? '').trim().toUpperCase();
    switch (b.op) {
      case 'insert':
      case 'bulk': {
        const words: unknown[] = b.op === 'insert' ? [b.word] : Array.isArray(b.words) ? b.words : [];
        const rows = words.map(clean).filter(Boolean).slice(0, 500)
          .map(word => ({ word, grade, hint: b.op === 'insert' ? b.hint || null : null, is_custom: true, ...PENDING }));
        if (!rows.length || !(grade >= 1 && grade <= 12)) return json({ inserted: 0 });
        const { error } = await sb.from('spelling_bee_words').insert(rows);
        return error ? json({ error: error.message }, { status: 500 }) : json({ inserted: rows.length });
      }
      case 'delete': {
        const { error } = await sb.from('spelling_bee_words').delete().eq('id', b.id);
        return error ? json({ error: error.message }, { status: 500 }) : json({ ok: true });
      }
      case 'reset': {
        // Back to the built-in list for this grade; those words count as checked ('legacy').
        await sb.from('spelling_bee_words').delete().eq('grade', grade);
        const rows = (SPELLING_BEE_DEFAULTS[grade] ?? [])
          .map(w => ({ word: clean(w), grade, is_custom: false, status: 'legacy' }));
        if (rows.length) {
          const { error } = await sb.from('spelling_bee_words').insert(rows);
          if (error) return json({ error: error.message }, { status: 500 });
        }
        return json({ ok: true });
      }
    }
  }
  return json({ error: 'Unknown operation' }, { status: 400 });
}
