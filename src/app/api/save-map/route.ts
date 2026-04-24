import { NextResponse } from 'next/server';
import fs   from 'fs';
import path from 'path';

// Allowed map IDs — add new maps here as you create them
const ALLOWED_MAPS = new Set(['school']);

export async function POST(req: Request) {
  try {
    const { mapId, walls, doors, hiddenSpots } = await req.json();

    if (!mapId || !ALLOWED_MAPS.has(mapId)) {
      return NextResponse.json({ error: 'Unknown map id' }, { status: 400 });
    }

    const dir      = path.join(process.cwd(), 'public', 'maps');
    const filePath = path.join(dir, `${mapId}.json`);

    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify({ id: mapId, walls, doors, hiddenSpots }, null, 2), 'utf-8');

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
