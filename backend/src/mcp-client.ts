import { spawn, ChildProcess } from 'child_process';
import { Tool } from './openrouter';

interface RpcRequest {
  jsonrpc: '2.0';
  id: number;
  method: string;
  params?: Record<string, unknown>;
}

interface RpcResponse {
  jsonrpc: '2.0';
  id: number;
  result?: any;
  error?: { code: number; message: string };
}

export class McpClient {
  private proc!: ChildProcess;
  private pending = new Map<number, { resolve: (v: any) => void; reject: (e: any) => void }>();
  private nextId = 1;
  private buffer = '';
  private command: string;
  private args: string[];

  constructor(command: string, args: string[] = []) {
    this.command = command;
    this.args = args;
    this.startProc();
  }

  private startProc() {
    this.proc = spawn(this.command, this.args, { stdio: ['pipe', 'pipe', 'pipe'] });

    this.proc.stdout?.on('data', (chunk: Buffer) => this.handleData(chunk));
    this.proc.stderr?.on('data', (chunk: Buffer) => {
      console.error('[mcp-server stderr]', chunk.toString().trim());
    });
    this.proc.on('exit', (code) => {
      console.log(`[mcp-server exited with code ${code}, restarting...]`);
      this.rejectAllPending(`MCP server exited with code ${code}`);
      setTimeout(() => this.startProc(), 1000);
    });
  }

  private rejectAllPending(reason: string) {
    for (const [id, entry] of this.pending) {
      this.pending.delete(id);
      entry.reject(new Error(reason));
    }
  }

  private handleData(chunk: Buffer) {
    this.buffer += chunk.toString();
    const lines = this.buffer.split('\n');
    this.buffer = lines.pop() ?? ''; // keep partial line in buffer

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const msg: RpcResponse = JSON.parse(line);
        const entry = this.pending.get(msg.id);
        if (entry) {
          this.pending.delete(msg.id);
          if (msg.error) entry.reject(new Error(msg.error.message));
          else entry.resolve(msg.result);
        }
      } catch {
        // non-JSON line (e.g. startup logs) — ignore
      }
    }
  }

  private call(method: string, params?: Record<string, unknown>, timeoutMs = 5000): Promise<any> {
    const id = this.nextId++;
    const req: RpcRequest = { jsonrpc: '2.0', id, method, params };
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`MCP call ${method} timed out after ${timeoutMs}ms`));
      }, timeoutMs);
      this.pending.set(id, {
        resolve: (v) => { clearTimeout(timer); resolve(v); },
        reject: (e) => { clearTimeout(timer); reject(e); },
      });
      this.proc.stdin?.write(JSON.stringify(req) + '\n');
    });
  }

  async listTools(): Promise<Tool[]> {
    const res = await this.call('tools/list');
    return (res.tools ?? []).map((t: any) => ({
      type: 'function' as const,
      function: {
        name: t.name,
        description: t.description,
        parameters: t.inputSchema ?? {},
      },
    }));
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<string> {
    const res = await this.call('tools/call', { name, arguments: args });
    const content = res.content as Array<{ type: string; text?: string }>;
    return content?.find((c) => c.type === 'text')?.text ?? JSON.stringify(res);
  }

  kill() {
    this.proc.kill();
  }
}
