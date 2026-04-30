import { PrismaClient } from "@prisma/client";

export const remotiveClient = {
  callTool: async (name: string, args: Record<string, unknown>) => {
    const API_URL =
      process.env.REMOTIVE_URL ??
      "https://talentnode-mcp-server-remotive.onrender.com";
    const res = await fetch(`${API_URL}/tools/call`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, arguments: args }),
    });
    if (!res.ok) throw new Error(`Remotive HTTP error: ${res.status}`);
    return res.json();
  },
};

export const adzunaClient = {
  callTool: async (name: string, args: Record<string, unknown>) => {
    const API_URL =
      process.env.ADZUNA_URL ??
      "https://talentnode-mcp-server-adzuna.onrender.com";
    const res = await fetch(`${API_URL}/tools/call`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, arguments: args }),
    });
    if (!res.ok) throw new Error(`Adzuna HTTP error: ${res.status}`);
    return res.json();
  },
};
