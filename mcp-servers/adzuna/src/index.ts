import dotenv from "dotenv";
import path from "path";
import express from "express";
import type { Request, Response } from "express";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const app = express();
app.use(express.json());

const APP_ID = process.env.ADZUNA_APP_ID!;
const APP_KEY = process.env.ADZUNA_APP_KEY!;
const COUNTRY = "in";

interface AdzunaJob {
  title: string;
  company: { display_name: string };
  location: { display_name: string };
  description: string;
  redirect_url: string;
  created: string;
}

async function searchAdzuna(query: string, location?: string): Promise<any[]> {
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

app.post("/tools/call", async (req: Request, res: Response) => {
  const { name, arguments: args } = req.body;

  if (name === "search_adzuna_jobs") {
    const query = (args?.query as string) ?? "";
    const location = args?.location as string | undefined;

    try {
      const jobs = await searchAdzuna(query, location);
      const formatted = jobs.map((j: AdzunaJob) => ({
        id: `adzuna-${Buffer.from(j.redirect_url).toString("base64").slice(0, 12)}`,
        title: j.title,
        company: j.company?.display_name ?? "Unknown",
        location: j.location?.display_name ?? "India",
        description: (j.description ?? "").replace(/<[^>]*>/g, "").slice(0, 300),
        url: j.redirect_url,
        postedAt: j.created?.split("T")[0] ?? "",
        source: "adzuna",
      }));

      res.json({ content: [{ type: "text", text: JSON.stringify(formatted, null, 2) }] });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
    return;
  }

  res.status(400).json({ error: `Unknown tool: ${name}` });
});

const PORT = process.env.PORT ?? 3001;
app.listen(PORT, () => {
  console.log(`Adzuna HTTP MCP running on port ${PORT}`);
});
