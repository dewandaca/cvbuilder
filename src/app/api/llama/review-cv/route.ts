import { NextResponse } from 'next/server';
import { reviewCV } from '@/app/actions';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const data = await reviewCV(formData);
    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown server error';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
