import { NextResponse } from 'next/server';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import { parseCvFromText } from '@/app/actions';

export const runtime = 'nodejs';

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
if (mimeType === "application/pdf") {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const parsed = await pdfParse(buffer);
    extractedText = parsed.text;

  } catch (error) {
    console.error("PDF Parse Error:", error);

    return NextResponse.json(
      { error: "Gagal membaca dokumen PDF." },
      { status: 400 }
    );
  }
}

// --- Handle DOCX / DOC ---
else if (DOCX_MIME_TYPES.includes(mimeType)) {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const result = await mammoth.extractRawText({ buffer });
    extractedText = result.value;

  } catch (error) {
    console.error("DOCX Parse Error:", error);

    return NextResponse.json(
      { error: "Gagal membaca dokumen DOCX." },
      { status: 400 }
    );
  }
}

// --- File tidak didukung ---
else {
  return NextResponse.json(
    { error: "Tipe file tidak didukung. Gunakan PDF atau DOCX/DOC." },
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
