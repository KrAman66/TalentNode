export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
}

export interface Job {
  id: string;
  title: string;
  company: string;
  location?: string;
  description?: string;
  url?: string;
  postedAt?: string;
}

export interface StreamCallbacks {
  onToken: (token: string) => void;
  onDone: (jobs: Job[] | null) => void;
  onError: (error: string) => void;
}

export async function sendMessage(
  messages: ChatMessage[],
  callbacks: StreamCallbacks
): Promise<void> {
  const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000';

  const res = await fetch(`${API_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
  });

  if (!res.ok) {
    const err = await res.text();
    callbacks.onError(`API error ${res.status}: ${err}`);
    return;
  }

  if (!res.body) {
    callbacks.onError('No response body');
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let fullContent = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split('\n\n');
    buffer = parts.pop() ?? '';

    for (const part of parts) {
      for (const line of part.split('\n')) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (!data) continue;

        try {
          const parsed = JSON.parse(data);
          if (parsed.token) {
            fullContent += parsed.token;
            callbacks.onToken(parsed.token);
          }
          if (parsed.done) {
            callbacks.onDone(parsed.jobs ?? null);
            return;
          }
          if (parsed.error) {
            callbacks.onError(parsed.error);
            return;
          }
        } catch {}
      }
    }
  }

  callbacks.onDone(null);
}
