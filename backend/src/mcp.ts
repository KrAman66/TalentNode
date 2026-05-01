import type { RequestWithId } from "./middleware/requestId";
import { logger } from "./utils/logger";

export const mcpClients: Record<
  string,
  {
    callTool: (
      name: string,
      args: Record<string, unknown>,
      requestId?: string,
    ) => Promise<any>;
  }
> = {};

const remotiveClient = {
  callTool: async (
    name: string,
    args: Record<string, unknown>,
    requestId?: string,
  ) => {
    const log = logger.child({ requestId, stage: "MCP_REMOTIVE", tool: name });
    const start = Date.now();
    try {
      const API_URL = process.env.REMOTIVE_URL;
      log.info({ args: JSON.stringify(args).slice(0, 200) }, "MCP request");
      const res = await fetch(`${API_URL}/tools/call`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, arguments: args }),
      });
      const duration = Date.now() - start;
      if (!res.ok) {
        log.error({ status: res.status, duration }, "MCP HTTP error");
        throw new Error(`Remotive HTTP error: ${res.status}`);
      }
      const data = await res.json();
      log.info(
        { duration, hasContent: !!data?.content?.[0]?.text },
        "MCP response",
      );
      return data;
    } catch (err: any) {
      log.error(
        { duration: Date.now() - start, error: err.message, stack: err.stack },
        "MCP error",
      );
      throw err;
    }
  },
};

const adzunaClient = {
  callTool: async (
    name: string,
    args: Record<string, unknown>,
    requestId?: string,
  ) => {
    const log = logger.child({ requestId, stage: "MCP_ADZUNA", tool: name });
    const start = Date.now();
    try {
      const API_URL = process.env.ADZUNA_URL;
      log.info({ args: JSON.stringify(args).slice(0, 200) }, "MCP request");
      const res = await fetch(`${API_URL}/tools/call`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, arguments: args }),
      });
      const duration = Date.now() - start;
      if (!res.ok) {
        log.error({ status: res.status, duration }, "MCP HTTP error");
        throw new Error(`Adzuna HTTP error: ${res.status}`);
      }
      const data = await res.json();
      log.info(
        { duration, hasContent: !!data?.content?.[0]?.text },
        "MCP response",
      );
      return data;
    } catch (err: any) {
      log.error(
        { duration: Date.now() - start, error: err.message, stack: err.stack },
        "MCP error",
      );
      throw err;
    }
  },
};

export { remotiveClient, adzunaClient };
