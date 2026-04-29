import { Router, Request, Response } from 'express';
import { streamChat, ChatMessage } from '../openrouter';
import { mcpClient } from '../mcp';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const router = Router();

const SYSTEM_PROMPT = `You are TalentNode, an AI job search assistant.
You help users find jobs by searching across job platforms.
When you need real-time job data, use the available tools to fetch listings.
Respond in a helpful, concise manner.`;

router.post('/', async (req: Request, res: Response) => {
  const { messages } = req.body as { messages: ChatMessage[] };

  if (!messages?.length) {
    res.status(400).json({ error: 'messages required' });
    return;
  }

  let jobs: any[] | undefined;

  try {
    const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
    const userText = (lastUserMsg?.content ?? '').toLowerCase();

    // Build messages for LLM
    const allMessages: ChatMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...messages,
    ];

    // Call MCP tool directly for any job-related query
    const jobKeywords = ['job', 'search', 'find', 'hiring', 'opening', 'position', 'career', 'role', 'full stack', 'frontend', 'backend', 'engineer', 'developer', 'swiggy', 'google', 'flipkart', 'bangalore', 'internship', 'remote', 'software'];
    const isJobQuery = jobKeywords.some((k) => userText.includes(k));

    if (isJobQuery) {
      try {
        console.log('Calling MCP tool: search_linkedin_jobs');
        const result = await mcpClient.callTool('search_linkedin_jobs', { query: lastUserMsg!.content, location: undefined });
        console.log('MCP raw result:', result);
        const parsed = JSON.parse(result);
        if (Array.isArray(parsed) && parsed.length > 0) {
          jobs = parsed;
          console.log('Parsed jobs:', jobs.length);
        } else {
          console.log('MCP returned empty results');
          allMessages.push({
            role: 'system',
            content: 'No jobs found from LinkedIn search. Inform the user that no matching jobs were found for their query.',
          });
        }
      } catch (e: any) {
        console.error('MCP tool call failed:', e.message);
      }

      // Save search history (non-blocking)
      prisma.searchHistory.create({
        data: {
          query: lastUserMsg!.content,
          results: jobs ? { count: jobs.length, jobs } : undefined,
        },
      }).catch(e => console.error('Failed to save search history:', e));
    }

    // If we have real job data, inject it so the LLM formats it
    if (jobs && jobs.length > 0) {
      const jobData = JSON.stringify(jobs);
      allMessages.push({
        role: 'system',
        content: `Here are job search results. Format them into a helpful response. For each job include: title, company, location, and a brief description. Note that URLs are not available in this alpha version.\n\nData: ${jobData}`,
      });
    }

    // Set SSE headers for streaming
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const stream = await streamChat(allMessages, []);
    const reader = stream.getReader();
    const decoder = new TextDecoder();

    let buffer = '';
    let streamDone = false;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      // OpenRouter SSE: events separated by \n\n, each line starts with "data: "
      const parts = buffer.split('\n\n');
      buffer = parts.pop() ?? '';

      for (const part of parts) {
        for (const line of part.split('\n')) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') {
            streamDone = true;
            continue;
          }
          try {
            const json = JSON.parse(data);
            const token = json.choices?.[0]?.delta?.content;
            if (token) {
              res.write(`data: ${JSON.stringify({ token })}\n\n`);
            }
          } catch {}
        }
      }
    }

    // Signal stream end with jobs payload
    res.write(`data: ${JSON.stringify({ done: true, jobs: jobs ?? null })}\n\n`);
    res.end();
  } catch (err: any) {
    console.error('Chat error:', err);
    res.write(`data: ${JSON.stringify({ error: err.message ?? 'Internal error' })}\n\n`);
    res.end();
  }
});

export default router;
