import { NextResponse } from 'next/server';
import { createRequire } from 'node:module';
import { parseCvFromText } from '@/app/actions';

// Use Node.js native require to bypass Turbopack's bundler interception for CommonJS modules
const _require = createRequire(import.meta.url);

const DOCX_MIME_TYPES = [
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/msword', // .doc
];

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const mimeType = file.type;
    let extractedText = '';

    // --- Handle PDF ---
    if (mimeType === 'application/pdf') {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const pdfParse = _require('pdf-parse') as (buffer: Buffer) => Promise<{ text: string }>;
      const parsed = await pdfParse(buffer);
      extractedText = parsed.text;
    }
    // --- Handle DOCX / DOC ---
    else if (DOCX_MIME_TYPES.includes(mimeType)) {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const mammoth = _require('mammoth') as {
        extractRawText: (input: { buffer: Buffer }) => Promise<{ value: string }>;
      };
      const result = await mammoth.extractRawText({ buffer });
      extractedText = result.value;
    }
    else {
      return NextResponse.json(
        { error: 'Tipe file tidak didukung. Gunakan PDF atau DOCX/DOC.' },
        { status: 400 }
      );
    }

    if (!extractedText.trim()) {
      return NextResponse.json(
        { error: 'Tidak dapat membaca teks dari file. Pastikan file tidak terenkripsi atau kosong.' },
        { status: 400 }
      );
    }

    // Use Groq LLM (GPT-OSS 120B) to parse the extracted text into structured CVData
    const jsonString = await parseCvFromText(extractedText);

    let parsedData: unknown;
    try {
      parsedData = JSON.parse(jsonString);
    } catch {
      return NextResponse.json(
        { error: 'AI gagal memproses CV. Silakan coba lagi.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: parsedData });
  } catch (error) {
    console.error('Error in parse-cv route:', error);
    const message = error instanceof Error ? error.message : 'Unknown server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
