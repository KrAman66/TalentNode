/// <reference types="node" />
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const server = new Server(
  { name: "adzuna-mcp", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

const APP_ID = process.env.ADZUNA_APP_ID!;
const APP_KEY = process.env.ADZUNA_APP_KEY!;
const COUNTRY = "in"; // India

interface AdzunaJob {
  title: string;
  company: { display_name: string };
  location: { display_name: string };
  description: string;
  redirect_url: string;
  created: string;
  category: { label: string };
}

async function searchAdzuna(query: string, location?: string): Promise<AdzunaJob[]> {
  const params = new URLSearchParams({
    app_id: APP_ID,
    app_key: APP_KEY,
    results_per_page: "20",
    what: query,
  });
  if (location) params.set("where", location);

  const url = `https://api.adzuna.com/v1/api/jobs/${COUNTRY}/search/1?${params}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Adzuna API error: ${res.status}`);
  const data = await res.json();
  return data.results ?? [];
}

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "search_adzuna_jobs",
      description:
        "Search Adzuna for job postings (India). Returns job title, company, location, description, and apply URL.",
      inputSchema: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Job title, skill, or keyword",
          },
          location: {
            type: "string",
            description: "City or region (e.g. Bangalore, Mumbai)",
          },
        },
        required: ["query"],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === "search_adzuna_jobs") {
    const query = (args?.query as string) ?? "";
    const location = args?.location as string | undefined;
    const jobs = await searchAdzuna(query, location);

    const formatted = jobs.map((j) => ({
      id: `adzuna-${Buffer.from(j.redirect_url).toString("base64").slice(0, 12)}`,
      title: j.title,
      company: j.company?.display_name ?? "Unknown",
      location: j.location?.display_name ?? "India",
      description: (j.description ?? "").replace(/<[^>]*>/g, "").slice(0, 300),
      url: j.redirect_url,
      postedAt: j.created?.split("T")[0] ?? "",
      source: "adzuna",
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
  console.error("[Adzuna MCP ERROR] Uncaught exception:", err);
});

main().catch((err) => {
  console.error("[Adzuna MCP ERROR] Startup failed:", err);
});
