import { NextResponse } from 'next/server';
import { chatInterview } from '@/app/actions';

type ChatInterviewRequestBody = {
  messages?: Array<{ role: 'user' | 'assistant'; content: string }>;
  context?: { mode: 'general' | 'technical'; jobTitle?: string; jobDesc?: string };
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ChatInterviewRequestBody;

    if (!body.context || !body.messages) {
      return NextResponse.json({ error: 'messages and context are required' }, { status: 400 });
    }

    const data = await chatInterview(body.messages, body.context);
    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown server error';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
