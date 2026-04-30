import { Router, Request, Response } from 'express';
import { streamChat, ChatMessage } from '../openrouter';
import { remotiveClient, adzunaClient } from '../mcp';
import { PrismaClient } from '@prisma/client';
import type { OptionalAuthRequest } from '../middleware/optionalAuth';

const prisma = new PrismaClient();

const router = Router();

const SYSTEM_PROMPT = `You are TalentNode, an AI job search assistant.
You help users find jobs by searching across job platforms (Remotive, Adzuna).
Respond in a helpful, concise manner. Keep responses to 1-2 sentences.`;

router.post('/', async (req: OptionalAuthRequest, res: Response) => {
  const { messages } = req.body as { messages: ChatMessage[] };

  if (!messages?.length) {
    res.status(400).json({ error: 'messages required' });
    return;
  }

  let allJobs: any[] = [];

  try {
    const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
    const userText = (lastUserMsg?.content ?? '').toLowerCase();

    // Build messages for LLM
    const allMessages: ChatMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...messages,
    ];

    // Call MCP tools directly for job-related queries
    const jobKeywords = ['job', 'search', 'find', 'hiring', 'opening', 'position', 'career', 'role', 'full stack', 'frontend', 'backend', 'engineer', 'developer', 'swiggy', 'google', 'flipkart', 'bangalore', 'internship', 'remote', 'software', 'work', 'opportunity'];
    const isJobQuery = jobKeywords.some((k) => userText.includes(k));

    if (isJobQuery && lastUserMsg) {
      const results = await Promise.allSettled([
        remotiveClient.callTool('search_remotive_jobs', { query: lastUserMsg.content })
          .then(r => { const p = JSON.parse(r); return p; })
          .catch(e => { console.error('Remotive MCP failed:', e.message); return []; }),
        adzunaClient.callTool('search_adzuna_jobs', { query: lastUserMsg.content })
          .then(r => { const p = JSON.parse(r); return p; })
          .catch(e => { console.error('Adzuna MCP failed:', e.message); return []; }),
      ]);

      for (const result of results) {
        if (result.status === 'fulfilled' && Array.isArray(result.value)) {
          allJobs.push(...result.value);
        }
      }

      console.log(`Total jobs found: ${allJobs.length} (Remotive/Adzuna)`);

      // Save search history + results (non-blocking, only if authenticated)
      if (req.userId) {
        prisma.searchHistory.create({
          data: {
            userId: req.userId,
            query: lastUserMsg.content,
            searchResults: {
              create: allJobs.map(j => ({
                jobId: j.id,
                source: j.source ?? 'unknown',
                title: j.title,
                company: j.company,
                location: j.location ?? null,
                url: j.url ?? null,
                postedAt: j.postedAt ?? null,
              })),
            },
          },
        }).catch(e => console.error('Failed to save search history:', e));
      }

      if (allJobs.length > 0) {
        allMessages.push({
          role: 'system',
          content: `User searched for "${lastUserMsg.content}". ${allJobs.length} jobs were found from Remotive and Adzuna. Give a brief 1-2 sentence response acknowledging the search results. Do NOT list the jobs in your response - they will be displayed as cards in the UI.`,
        });
      } else {
        allMessages.push({
          role: 'system',
          content: 'No jobs found from any platform. Inform the user that no matching jobs were found for their query.',
        });
      }
    }

    // Set SSE headers for streaming
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const stream = await streamChat(allMessages, []);
    const reader = stream.getReader();
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
            const json = JSON.parse(data);
            const token = json?.choices?.[0]?.delta?.content;
            if (token) {
              res.write(`data: ${JSON.stringify({ token })}\n\n`);
            }
          } catch {}
        }
      }
    }

    // Signal stream end with jobs payload
    res.write(`data: ${JSON.stringify({ done: true, jobs: allJobs.length > 0 ? allJobs : null })}\n\n`);
    res.end();
  } catch (err: any) {
    console.error('Chat error:', err);
    res.write(`data: ${JSON.stringify({ error: err.message ?? 'Internal error' })}\n\n`);
    res.end();
  }
});

export default router;
