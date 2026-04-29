import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';

const REGISTRY = path.join(process.cwd(), 'public', 'characters', 'registry.json');

export async function GET() {
  try {
    const raw = await fs.readFile(REGISTRY, 'utf-8');
    return NextResponse.json(JSON.parse(raw));
  } catch {
    return NextResponse.json({ characters: [], outfits: [] });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  await fs.mkdir(path.dirname(REGISTRY), { recursive: true });
  await fs.writeFile(REGISTRY, JSON.stringify(body, null, 2));
  return NextResponse.json({ ok: true });
}
