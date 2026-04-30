/// <reference types="node" />
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const server = new Server(
  { name: "linkedin-mcp", version: "1.0.0" },
  { capabilities: { tools: {} } },
);

// Mock job data for alpha — replace with real LinkedIn API / scraping later
function normalize(str: string): string {
  return str.toLowerCase().replace(/[-_]/g, " ");
}

function searchJobs(query: string, location?: string) {
  const qWords = normalize(query)
    .split(/\s+/)
    .filter((w) => w.length > 2);
  const mockJobs = [
    {
      id: "job-1",
      title: "Senior Software Engineer",
      company: "Google",
      location: location ?? "Bangalore",
      description: "Build scalable systems with a world-class team. Requires 5+ years experience with distributed systems.",
      source: "linkedin",
    },
    {
      id: "job-2",
      title: "Full Stack Developer",
      company: "Swiggy",
      location: location ?? "Bangalore",
      description: "Work on consumer-facing products serving millions. React, Node.js, TypeScript.",
      source: "linkedin",
    },
    {
      id: "job-3",
      title: "Backend Engineer",
      company: "Flipkart",
      location: location ?? "Bangalore",
      description: "Design and scale backend services for e-commerce. Java, Spring Boot, microservices.",
      source: "linkedin",
    },
  ];

  return mockJobs.filter((j) => {
    const title = normalize(j.title);
    const desc = normalize(j.description);
    const company = normalize(j.company);
    return qWords.some(
      (w) => title.includes(w) || desc.includes(w) || company.includes(w),
    );
  });
}

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "search_linkedin_jobs",
      description:
        "Search LinkedIn for job postings. Returns job title, company, location, description, and URL.",
      inputSchema: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Job title, skill, or keyword",
          },
          location: {
            type: "string",
            description: "City or region (e.g. Bangalore, Jamshedpur)",
          },
        },
        required: ["query"],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === "search_linkedin_jobs") {
    const query = (args?.query as string) ?? "";
    const location = args?.location as string | undefined;
    const jobs = searchJobs(query, location);

    return {
      content: [{ type: "text", text: JSON.stringify(jobs, null, 2) }],
    };
  }

  throw new Error(`Unknown tool: ${name}`);
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

process.on("uncaughtException", (err) => {
  console.error("[MCP ERROR] Uncaught exception:", err);
});

main().catch((err) => {
  console.error("[MCP ERROR] Startup failed:", err);
});
