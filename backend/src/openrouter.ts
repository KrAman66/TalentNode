import { logger } from './utils/logger';

const MODEL = process.env.OPENROUTER_MODEL || 'tencent/hy3-preview:free';

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

function truncate(str: string, max = 200): string {
  return str.length > max ? str.slice(0, max) + '...' : str;
}

function sanitizeMessages(messages: ChatMessage[]): ChatMessage[] {
  return messages.map(m => {
    const base = { ...m, content: truncate(m.content, 100) };
    if (m.tool_calls?.length) {
      base.tool_calls = m.tool_calls.map(tc => ({
        ...tc,
        function: { ...tc.function, arguments: truncate(tc.function.arguments ?? '', 50) },
      }));
    }
    return base;
  });
}

export async function chat(
  messages: ChatMessage[],
  tools?: Tool[],
  requestId?: string
): Promise<{ content: string | null; toolCalls: any[] }> {
  const BASE_URL = process.env.OPENROUTER_BASE_URL!;
  const API_KEY = process.env.OPENROUTER_API_KEY!;
  const log = logger.child({ requestId, stage: 'LLM_REQUEST' });

  const body: Record<string, unknown> = {
    model: MODEL,
    messages,
  };
  if (tools?.length) {
    body.tools = tools;
    body.tool_choice = 'auto';
  }

  log.info({ model: MODEL, msgCount: messages.length, tools: tools?.map(t => t.function.name) }, 'LLM request');

  const start = Date.now();
  try {
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
      log.error({ status: res.status, body: truncate(err, 300) }, 'LLM request failed');
      if (res.status === 429) {
        throw new Error('Rate limit exceeded. Please wait a moment and try again.');
      }
      throw new Error(`OpenRouter error ${res.status}: ${err}`);
    }

    const data = await res.json();
    const choice = data.choices?.[0];
    const msg = choice?.message;
    const duration = Date.now() - start;

    log.info(
      {
        model: MODEL,
        duration,
        hasContent: !!msg?.content,
        toolCalls: msg?.tool_calls?.map((tc: any) => tc.function?.name),
        raw: truncate(JSON.stringify(msg), 300),
      },
      'LLM response'
    );

    return {
      content: msg?.content ?? null,
      toolCalls: msg?.tool_calls ?? [],
    };
  } catch (err: any) {
    log.error({ duration: Date.now() - start, error: err.message, stack: err.stack }, 'LLM request error');
    throw err;
  }
}

export async function streamChat(
  messages: ChatMessage[],
  tools?: Tool[],
  requestId?: string
): Promise<ReadableStream> {
  const BASE_URL = process.env.OPENROUTER_BASE_URL!;
  const API_KEY = process.env.OPENROUTER_API_KEY!;
  const log = logger.child({ requestId, stage: 'LLM_STREAM' });

  const body: Record<string, unknown> = {
    model: MODEL,
    messages,
    stream: true,
  };
  if (tools?.length) {
    body.tools = tools;
    body.tool_choice = 'auto';
  }

  log.info({ model: MODEL, msgCount: messages.length, tools: tools?.map(t => t.function.name) }, 'LLM stream request');

  const start = Date.now();
  try {
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
      log.error({ status: res.status, body: truncate(err, 300) }, 'LLM stream failed');
      if (res.status === 429) {
        throw new Error('Rate limit exceeded. Please wait a moment and try again.');
      }
      throw new Error(`OpenRouter error ${res.status}: ${err}`);
    }

    log.info({ duration: Date.now() - start }, 'LLM stream started');
    return res.body!;
  } catch (err: any) {
    log.error({ duration: Date.now() - start, error: err.message, stack: err.stack }, 'LLM stream error');
    throw err;
  }
}
