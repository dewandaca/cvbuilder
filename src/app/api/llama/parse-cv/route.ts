import { NextResponse } from 'next/server';
import { createRequire } from 'node:module';
import { parseCvFromText } from '@/app/actions';

// Use Node.js native require to bypass Turbopack's bundler interception for CommonJS modules
const _require = createRequire(import.meta.url);

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

      // Use _require (createRequire) so Turbopack doesn't intercept/bundle this CJS module
      const pdfParse = _require('pdf-parse') as (buffer: Buffer) => Promise<{ text: string }>;
      const parsed = await pdfParse(buffer);
      extractedText = parsed.text;
    }
    // --- Handle plain text ---
    else if (mimeType === 'text/plain') {
      extractedText = await file.text();
    }
    // --- Handle images (JPG, PNG, WEBP) ---
    else if (mimeType.startsWith('image/')) {
      const arrayBuffer = await file.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString('base64');
      const dataUrl = `data:${mimeType};base64,${base64}`;

      // Use Groq vision model for image-based CVs
      const Groq = (await import('groq-sdk')).default;
      const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

      const visionCompletion = await groq.chat.completions.create({
        model: 'meta-llama/llama-4-scout-17b-16e-instruct',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: { url: dataUrl },
              },
              {
                type: 'text',
                text: 'Please extract ALL text from this CV/resume image. Preserve the structure as much as possible, including section headers, bullet points, dates, and all personal information. Output only the extracted text.',
              },
            ],
          },
        ],
        temperature: 0.1,
        max_tokens: 4096,
      });

      extractedText = visionCompletion.choices[0]?.message?.content || '';
    } else {
      return NextResponse.json(
        { error: 'Tipe file tidak didukung. Gunakan PDF, JPG, atau PNG.' },
        { status: 400 }
      );
    }

    if (!extractedText.trim()) {
      return NextResponse.json(
        { error: 'Tidak dapat membaca teks dari file. Pastikan file tidak terenkripsi atau kosong.' },
        { status: 400 }
      );
    }

    // Use Groq LLM to parse the extracted text into structured CVData
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
