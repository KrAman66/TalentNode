import { Router, Request, Response } from "express";
import { streamChat } from "../openrouter";
import type { ChatMessage } from "../openrouter";
import type { RequestWithId } from "../middleware/requestId";
import { remotiveClient, adzunaClient } from "../mcp";
import { PrismaClient } from "@prisma/client";
import { logger } from "../utils/logger";

const prisma = new PrismaClient();

const router = Router();

const SYSTEM_PROMPT = `You are TalentNode, an AI job search assistant.
You help users find jobs by searching across job platforms (Adzuna).
Respond in a helpful, concise manner. Keep responses to 1-2 sentences.`;

router.post("/", async (req: RequestWithId, res: Response) => {
  const requestId = req.requestId;
  const log = logger.child({ requestId, stage: "CHAT_ROUTE" });
  const totalStart = Date.now();

  try {
    const { messages } = req.body as { messages: ChatMessage[] };
    if (!messages?.length) {
      log.warn({ body: req.body }, "Missing messages");
      res.status(400).json({ error: "messages required" });
      return;
    }

    log.info(
      {
        msgCount: messages.length,
        firstMsg: messages[0]?.content?.slice(0, 80),
      },
      "Chat request received",
    );

    let allJobs: any[] = [];
    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
    const userText = (lastUserMsg?.content ?? "").toLowerCase();

    // Build messages for LLM
    const allMessages: ChatMessage[] = [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages,
    ];

    // Call MCP tools for job queries
    const jobKeywords = [
      "job",
      "search",
      "find",
      "hiring",
      "opening",
      "position",
      "career",
      "role",
      "full stack",
      "frontend",
      "backend",
      "engineer",
      "developer",
      "swiggy",
      "google",
      "flipkart",
      "bangalore",
      "internship",
      "remote",
      "software",
      "work",
      "opportunity",
    ];
    const isJobQuery = jobKeywords.some((k) => userText.includes(k));

    if (isJobQuery && lastUserMsg) {
      log.info({ query: lastUserMsg.content }, "Starting MCP tool calls");
      const cleanedQuery = lastUserMsg.content
        .toLowerCase()
        .replace(/\b(find|me|job|jobs|show|search|for)\b/g, "")
        .trim();

      const mcpStart = Date.now();
      const results = await Promise.allSettled([
        // remotiveClient.callTool(
        //   "search_remotive_jobs",
        //   { query: lastUserMsg.content },
        //   requestId,
        // ),

        adzunaClient.callTool(
          "search_adzuna_jobs",
          { query: cleanedQuery },
          requestId,
        ),
      ]);
      const mcpDuration = Date.now() - mcpStart;

      // const extractJobs = (res: any) => {
      //   try {
      //     const text = res?.content?.[0]?.text;
      //     if (!text) return [];
      //     return JSON.parse(text);
      //   } catch (e) {
      //     return [];
      //   }
      // };

      for (const result of results) {
        if (result.status === "rejected") {
          log.error({ reason: result.reason }, "MCP call failed");
          continue;
        }

        try {
          const raw = result.value;

          log.info(
            { rawMcpResponse: JSON.stringify(raw).slice(0, 500) },
            "Raw MCP response",
          );

          const text = raw?.content?.find((c: any) => c.type === "text")?.text;

          if (!text) {
            log.warn("No text content in MCP response");
            continue;
          }

          const parsedJobs = JSON.parse(text);

          log.info({ parsedJobsCount: parsedJobs.length }, "Parsed MCP jobs");

          if (Array.isArray(parsedJobs)) {
            allJobs.push(...parsedJobs);
          }
        } catch (err) {
          log.error({ error: err }, "MCP parse error");
        }
      }

      if (allJobs.length === 0) {
        log.warn("No jobs parsed from MCP response");
      }

      log.info(
        {
          totalJobs: allJobs.length,
          mcpDuration,
          results: results.map((r) => r.status),
        },
        "MCP calls completed",
      );

      // Save search history (non-blocking, only if authenticated)
      if (req.userId) {
        const saveStart = Date.now();
        prisma.searchHistory
          .create({
            data: {
              userId: req.userId,
              query: lastUserMsg.content,
              searchResults: {
                create: allJobs.map((j) => ({
                  jobId: j.id,
                  source: j.source ?? "unknown",
                  title: j.title,
                  company: j.company,
                  location: j.location ?? null,
                  url: j.url ?? null,
                  postedAt: j.postedAt ?? null,
                })),
              },
            },
          })
          .then(() =>
            log.debug(
              { duration: Date.now() - saveStart },
              "Search history saved",
            ),
          )
          .catch((e) =>
            log.error({ error: e.message }, "Failed to save search history"),
          );
      }

      if (allJobs.length > 0) {
        allMessages.push({
          role: "system",
          content: `User searched for "${lastUserMsg.content}". ${allJobs.length} jobs were found from Adzuna. Give a brief 1-2 sentence response acknowledging the search results. Do NOT list the jobs in your response - they will be displayed as cards in the UI.`,
        });
      } else {
        allMessages.push({
          role: "system",
          content:
            "No jobs found from any platform. Inform the user that no matching jobs were found for their query.",
        });
      }
    }

    // Stream LLM response
    log.info(
      { msgCount: allMessages.length, hasJobs: allJobs.length > 0 },
      "Starting LLM stream",
    );
    const streamStart = Date.now();

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const stream = await streamChat(allMessages, [], requestId);
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let tokenCount = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split("\n\n");
      buffer = parts.pop() ?? "";

      for (const part of parts) {
        for (const line of part.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (!data) continue;

          try {
            const parsed = JSON.parse(data);
            if (parsed.token) {
              tokenCount++;
              res.write(`data: ${JSON.stringify({ token: parsed.token })}\n\n`);
            }
          } catch {}
        }
      }
    }

    const streamDuration = Date.now() - streamStart;
    log.info(
      { tokenCount, streamDuration, jobCount: allJobs.length },
      "LLM stream completed",
    );

    // Signal stream end with jobs payload
    res.write(
      `data: ${JSON.stringify({ done: true, jobs: allJobs.length > 0 ? allJobs : null })}\n\n`,
    );
    res.end();

    log.info(
      { totalDuration: Date.now() - totalStart },
      "Chat request completed",
    );
  } catch (err: any) {
    log.error(
      {
        error: err.message,
        stack: err.stack,
        totalDuration: Date.now() - totalStart,
      },
      "Chat request failed",
    );
    try {
      res.write(
        `data: ${JSON.stringify({ error: err.message ?? "Internal error" })}\n\n`,
      );
      res.end();
    } catch {}
  }
});

export default router;
