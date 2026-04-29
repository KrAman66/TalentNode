import { McpClient } from './mcp-client';

export const mcpClient = new McpClient(
  'node',
  ['../mcp-servers/linkedin/dist/index.js']
);
