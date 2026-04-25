import { NextRequest, NextResponse } from 'next/server';

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
      const officeParser = require('officeparser');
      text = await new Promise<string>((resolve, reject) => {
        officeParser.parseOffice(buffer, (data: string, err: Error) => {
          if (err) reject(err); else resolve(data);
        }, { outputErrorToConsole: false });
      });

    } else {
      return NextResponse.json({ error: `Unsupported file type: .${ext}` }, { status: 400 });
    }

    return NextResponse.json({ text: text.trim() });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'Failed to extract text' }, { status: 500 });
  }
}
