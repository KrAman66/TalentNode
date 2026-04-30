export interface ChatMessage {
  role: 'system' | 'user' | 'assitant' | 'tool';
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
  source?: string;
}

export interface User {
  id: string;
  email: string;
  name?: string;
}

export interface StreamCallbacks {
  onToken: (token: string) => void;
  onDone: (jobs: Job[] | null) => void;
  onError: (error: string) => void;
}

function getToken(): string | null {
  return localStorage.getItem('talentnode_token');
}

export async function sendMessage(
  messages: ChatMessage[],
  callbacks: StreamCallbacks
): Promise<void> {
  const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000';
  const token = getToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}/api/chat`, {
    method: 'POST',
    headers,
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

export async function saveJob(job: Job): Promise<void> {
  const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000';
  const token = getToken();

  if (!token) throw new Error('Please log in to save jobs');

  const res = await fetch(`${API_URL}/api/saved-jobs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      jobData: job,
      source: job.source ?? 'adzuna',
      externalId: job.id,
      title: job.title,
      company: job.company,
      location: job.location,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Save failed: ${err}`);
  }
}

export async function toggleJobInteraction(jobId: string, source: string, type: string): Promise<boolean> {
  const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000';
  const token = getToken();

  if (!token) throw new Error('Please log in to interact with jobs');

  const res = await fetch(`${API_URL}/api/job-interactions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ jobId, source, type }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Interaction failed: ${err}`);
  }

  const data = await res.json();
  return !data.removed;
}

export async function login(email: string, password: string): Promise<{ token: string; user: any }> {
  const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000';

  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Login failed: ${err}`);
  }

  const data = await res.json();
  localStorage.setItem('talentnode_token', data.token);
  localStorage.setItem('talentnode_user', JSON.stringify(data.user));
  return data;
}

export async function register(email: string, password: string, name?: string): Promise<{ token: string; user: any }> {
  const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000';

  const res = await fetch(`${API_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Registration failed: ${err}`);
  }

  const data = await res.json();
  localStorage.setItem('talentnode_token', data.token);
  localStorage.setItem('talentnode_user', JSON.stringify(data.user));
  return data;
}

export function logout() {
  localStorage.removeItem('talentnode_token');
  localStorage.removeItem('talentnode_user');
}

export function getCurrentUser(): any | null {
  const user = localStorage.getItem('talentnode_user');
  return user ? JSON.parse(user) : null;
}
