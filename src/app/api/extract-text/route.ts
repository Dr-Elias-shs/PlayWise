import { NextRequest, NextResponse } from 'next/server';

// Extract text nodes from PPTX/PPT slide XML (<a:t> tags)
async function extractPptxText(buffer: Buffer): Promise<string> {
  const JSZip = require('jszip');
  const zip = await JSZip.loadAsync(buffer);

  const slideNames = Object.keys(zip.files)
    .filter(n => /^ppt\/slides\/slide\d+\.xml$/.test(n))
    .sort((a, b) => {
      const num = (s: string) => parseInt(s.match(/\d+/)![0], 10);
      return num(a) - num(b);
    });

  const chunks: string[] = [];
  for (const name of slideNames) {
    const xml: string = await zip.files[name].async('string');
    for (const m of Array.from(xml.matchAll(/<a:t[^>]*>([^<]+)<\/a:t>/g))) {
      chunks.push(m[1]);
    }
    chunks.push('\n');
  }
  return chunks.join(' ');
}

export async function POST(req: NextRequest) {
  let file: File | null = null;
  try {
    const formData = await req.formData();
    file = formData.get('file') as File | null;
  } catch (e: any) {
    return NextResponse.json({ error: 'Failed to read upload: ' + (e.message ?? e) }, { status: 400 });
  }

  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    let text = '';

    if (ext === 'pdf') {
      // Use lib path to avoid pdf-parse loading test fixtures on import
      const pdfParse = require('pdf-parse/lib/pdf-parse.js');
      const result = await pdfParse(buffer);
      text = result.text;

    } else if (ext === 'docx') {
      const mammoth = require('mammoth');
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;

    } else if (ext === 'pptx' || ext === 'ppt') {
      text = await extractPptxText(buffer);

    } else {
      return NextResponse.json({ error: `Unsupported file type: .${ext}` }, { status: 400 });
    }

    return NextResponse.json({ text: text.trim() });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'Failed to extract text' }, { status: 500 });
  }
}
