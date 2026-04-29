import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';

export async function POST(req: NextRequest) {
  const form     = await req.formData();
  const file     = form.get('file')     as File   | null;
  const filePath = form.get('path')     as string | null;

  if (!file || !filePath) {
    return NextResponse.json({ error: 'Missing file or path' }, { status: 400 });
  }
  if (!filePath.startsWith('/characters/')) {
    return NextResponse.json({ error: 'Path must start with /characters/' }, { status: 400 });
  }

  const fullPath = path.join(process.cwd(), 'public', filePath);
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.writeFile(fullPath, Buffer.from(await file.arrayBuffer()));

  return NextResponse.json({ ok: true, path: filePath });
}
