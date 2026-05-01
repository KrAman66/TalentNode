import express from "express";
import type { Request, Response } from "express";

const app = express();
app.use(express.json());

const REMOTIVE_API = "https://remotive.io/api/remote-jobs";

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
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000); // 10s

  try {
    console.log("Fetching Remotive jobs...");

    const res = await fetch(REMOTIVE_API, {
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(`Remotive API error: ${res.status}`);
    }

    const data = await res.json();
    const jobs: RemotiveJob[] = data.jobs ?? [];

    console.log("Total jobs fetched:", jobs.length);

    const q = query.toLowerCase();

    const filtered = jobs.filter((j) => {
      const haystack =
        `${j.title} ${j.company_name} ${j.description} ${j.job_type}`.toLowerCase();
      return q
        .split(/\s+/)
        .some((word) => word.length > 2 && haystack.includes(word));
    });

    console.log("Filtered jobs:", filtered.length);

    return filtered.slice(0, 20); // limit
  } catch (err) {
    console.error("Remotive fetch failed:", err);
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

app.post("/tools/call", async (req: Request, res: Response) => {
  const { name, arguments: args } = req.body;

  if (name === "search_remotive_jobs") {
    const query = (args?.query as string) ?? "";
    try {
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

      res.json({
        content: [{ type: "text", text: JSON.stringify(formatted, null, 2) }],
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
    return;
  }

  res.status(400).json({ error: `Unknown tool: ${name}` });
});

const PORT = process.env.PORT ?? 3002;
app.listen(PORT, () => {
  console.log(`Remotive HTTP MCP running on port ${PORT}`);
});
