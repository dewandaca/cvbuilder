type ApiEnvelope<T> = {
  data?: T;
  error?: string;
};

async function requestApi<T>(input: RequestInfo | URL, init: RequestInit): Promise<T> {
  const response = await fetch(input, init);

  let payload: ApiEnvelope<T> | null = null;
  try {
    payload = (await response.json()) as ApiEnvelope<T>;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message = payload?.error || `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  if (!payload || !('data' in payload)) {
    throw new Error('Invalid API response');
  }

  return payload.data as T;
}

export async function polishTextApi(
  text: string,
  type: 'summary' | 'bullet',
  mode: 'id' | 'en' = 'id',
): Promise<string> {
  return requestApi<string>('/api/llama/polish-text', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text, type, mode }),
  });
}

export async function reviewCvApi<T>(formData: FormData): Promise<T | null> {
  return requestApi<T | null>('/api/llama/review-cv', {
    method: 'POST',
    body: formData,
  });
}

export async function matchRoleApi<T>(formData: FormData): Promise<T | null> {
  return requestApi<T | null>('/api/llama/match-role', {
    method: 'POST',
    body: formData,
  });
}

export async function parseCvApi<T>(formData: FormData): Promise<T> {
  return requestApi<T>('/api/llama/parse-cv', {
    method: 'POST',
    body: formData,
  });
}

export type InterviewMessagePayload = {
  role: 'user' | 'assistant';
  content: string;
};

export type InterviewChatContext = {
  mode: 'general' | 'technical';
  jobTitle?: string;
  jobDesc?: string;
};

export type InterviewReportContext = {
  mode: 'general' | 'technical';
  jobTitle: string;
};

export async function chatInterviewApi(
  messages: InterviewMessagePayload[],
  context: InterviewChatContext,
): Promise<{ reply: string; shouldFinish: boolean }> {
  return requestApi<{ reply: string; shouldFinish: boolean }>('/api/llama/chat-interview', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ messages, context }),
  });
}

export async function generateInterviewReportApi<T>(
  messages: InterviewMessagePayload[],
  context: InterviewReportContext,
): Promise<T | null> {
  return requestApi<T | null>('/api/llama/interview-report', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ messages, context }),
  });
}
