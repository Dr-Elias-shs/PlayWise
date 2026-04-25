// Resolves the Ollama base URL at request time.
// Priority: OLLAMA_BASE_URL env var → Supabase system_config → localhost fallback

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY!;

let _cached: string | null = null;
let _expiry = 0;

export async function getOllamaBase(): Promise<string> {
  if (process.env.OLLAMA_BASE_URL) return process.env.OLLAMA_BASE_URL;

  const now = Date.now();
  if (_cached && now < _expiry) return _cached;

  try {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/system_config?key=eq.gatewayBaseUrl&select=value&limit=1`,
      {
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
        cache: 'no-store',
      },
    );
    if (r.ok) {
      const rows = await r.json();
      if (rows[0]?.value) {
        _cached = rows[0].value as string;
        _expiry = now + 60_000;
        return _cached;
      }
    }
  } catch {}

  return 'http://localhost:11434';
}
