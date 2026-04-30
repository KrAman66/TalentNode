/// <reference types="node" />
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const server = new Server(
  { name: "remotive-mcp", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

interface RemotiveJob {
  id: string;
  title: string;
  company_name: string;
  candidate_required_location: string;
  description: string;
  url: string;
  publication_date: string;
  job_type: string;
}

async function searchRemotive(query: string): Promise<RemotiveJob[]> {
  const url = "https://remotive.io/api/remote-jobs";
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Remotive API error: ${res.status}`);
  const data = await res.json();
  const jobs: RemotiveJob[] = data.jobs ?? [];

  const q = query.toLowerCase();
  return jobs.filter((j) => {
    const haystack = `${j.title} ${j.company_name} ${j.description} ${j.job_type}`.toLowerCase();
    return q.split(/\s+/).some((word) => word.length > 2 && haystack.includes(word));
  });
}

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "search_remotive_jobs",
      description: "Search Remotive for remote job postings. Returns job title, company, location, description, and apply URL.",
      inputSchema: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Job title, skill, or keyword (e.g. 'react developer', 'python')",
          },
        },
        required: ["query"],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === "search_remotive_jobs") {
    const query = (args?.query as string) ?? "";
    const jobs = await searchRemotive(query);

    const formatted = jobs.map((j) => ({
      id: `remotive-${j.id}`,
      title: j.title,
      company: j.company_name,
      location: j.candidate_required_location,
      description: j.description?.replace(/<[^>]*>/g, "").slice(0, 300) ?? "",
      url: j.url,
      postedAt: j.publication_date?.split("T")[0] ?? "",
      source: "remotive",
    }));

    return {
      content: [{ type: "text", text: JSON.stringify(formatted, null, 2) }],
    };
  }

  throw new Error(`Unknown tool: ${name}`);
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

process.on("uncaughtException", (err) => {
  console.error("[Remotive MCP ERROR] Uncaught exception:", err);
});

main().catch((err) => {
  console.error("[Remotive MCP ERROR] Startup failed:", err);
});
