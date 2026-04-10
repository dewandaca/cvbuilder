import { NextResponse } from 'next/server';
import { generateInterviewReport } from '@/app/actions';

type InterviewReportRequestBody = {
  messages?: Array<{ role: 'user' | 'assistant'; content: string }>;
  context?: { mode: 'general' | 'technical'; jobTitle: string };
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as InterviewReportRequestBody;

    if (!body.context || !body.messages) {
      return NextResponse.json({ error: 'messages and context are required' }, { status: 400 });
    }

    const data = await generateInterviewReport(body.messages, body.context);
    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown server error';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
