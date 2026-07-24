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
  return requestApi<string>('/api/ai/polish-text', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text, type, mode }),
  });
}

export async function parseCvApi<T>(formData: FormData): Promise<T> {
  return requestApi<T>('/api/ai/parse-cv', {
    method: 'POST',
    body: formData,
  });
}
