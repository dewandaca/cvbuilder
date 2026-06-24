import { NextResponse } from 'next/server';
import { polishText } from '@/app/actions';

type PolishRequestBody = {
  text?: string;
  type?: 'summary' | 'bullet';
  mode?: 'id' | 'en';
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as PolishRequestBody;

    if (!body.text || !body.type) {
      return NextResponse.json({ error: 'text and type are required' }, { status: 400 });
    }

    const mode = body.mode === 'en' ? 'en' : 'id';
    const data = await polishText(body.text, body.type, mode);

    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown server error';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
