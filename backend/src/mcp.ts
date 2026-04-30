import { McpClient } from './mcp-client';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

export const remotiveClient = new McpClient(
  'node',
  ['../mcp-servers/remotive/dist/index.js']
);

export const adzunaClient = new McpClient(
  'node',
  ['../mcp-servers/adzuna/dist/index.js']
);
