export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

export interface Tool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export async function chat(
  messages: ChatMessage[],
  tools?: Tool[]
): Promise<{ content: string | null; toolCalls: any[] }> {
  const BASE_URL = process.env.OPENROUTER_BASE_URL!;
  const API_KEY = process.env.OPENROUTER_API_KEY!;

  const body: Record<string, unknown> = {
    model: 'openrouter/free',
    messages,
  };
  if (tools?.length) {
    body.tools = tools;
    body.tool_choice = 'auto';
  }

  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    if (res.status === 429) {
      throw new Error('Rate limit exceeded. Please wait a moment and try again.');
    }
    throw new Error(`OpenRouter error ${res.status}: ${err}`);
  }

  const data = await res.json();
  const choice = data.choices?.[0];
  const msg = choice?.message;

  return {
    content: msg?.content ?? null,
    toolCalls: msg?.tool_calls ?? [],
  };
}

export async function streamChat(
  messages: ChatMessage[],
  tools?: Tool[]
): Promise<ReadableStream> {
  const BASE_URL = process.env.OPENROUTER_BASE_URL!;
  const API_KEY = process.env.OPENROUTER_API_KEY!;

  const body: Record<string, unknown> = {
    model: 'openrouter/free',
    messages,
    stream: true,
  };
  if (tools?.length) {
    body.tools = tools;
    body.tool_choice = 'auto';
  }

  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    if (res.status === 429) {
      throw new Error('Rate limit exceeded. Please wait a moment and try again.');
    }
    throw new Error(`OpenRouter error ${res.status}: ${err}`);
  }

  return res.body!;
}
