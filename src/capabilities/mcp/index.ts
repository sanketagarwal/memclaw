/**
 * MCP — connect external Model Context Protocol tool servers.
 *
 * This is the fastest way to give memclaw a lot of tools: point it at any MCP
 * server (GitHub, filesystem, Postgres, Notion, Slack, Brave Search, and the
 * hundreds of others in the ecosystem) and the agent gains all of that server's
 * tools. No code — just a JSON config file.
 *
 * Create `memclaw.mcp.json` in the project root (see memclaw.mcp.json.example):
 *
 *   {
 *     "servers": {
 *       "filesystem": {
 *         "command": "npx",
 *         "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/dir"]
 *       },
 *       "github": {
 *         "command": "npx",
 *         "args": ["-y", "@modelcontextprotocol/server-github"],
 *         "env": { "GITHUB_PERSONAL_ACCESS_TOKEN": "ghp_..." }
 *       }
 *     }
 *   }
 *
 * Tool names are namespaced as `server_tool`, and every MCP tool call is traced
 * in Mastra Studio like any other tool.
 */
import { existsSync, readFileSync } from 'node:fs';
import { defineCapability } from '../types.ts';

const CONFIG_PATH = process.env.MEMCLAW_MCP_CONFIG ?? 'memclaw.mcp.json';

interface RawServer {
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
  [k: string]: unknown;
}

function readServers(): Record<string, RawServer> | null {
  if (!existsSync(CONFIG_PATH)) return null;
  try {
    const parsed = JSON.parse(readFileSync(CONFIG_PATH, 'utf8')) as {
      servers?: Record<string, RawServer>;
    } & Record<string, RawServer>;
    const servers = parsed.servers ?? parsed;
    return servers && Object.keys(servers).length > 0 ? servers : null;
  } catch {
    return null;
  }
}

export const mcpCapability = defineCapability({
  id: 'mcp',
  name: 'MCP',
  description: 'Connect external MCP tool servers (GitHub, filesystem, Notion, …) and expose their tools.',
  version: '0.1.0',
  author: 'memclaw',
  env: [
    {
      name: 'MEMCLAW_MCP_CONFIG',
      description: `Path to the MCP servers JSON (default: ${CONFIG_PATH})`,
      required: false,
    },
  ],
  // Only active when a config file with at least one server exists.
  enabled: () => readServers() !== null,
  tools: async () => {
    const servers = readServers();
    if (!servers) return {};

    const { MCPClient } = await import('@mastra/mcp');

    // Normalize: HTTP servers want a URL object, not a string.
    const normalized: Record<string, Record<string, unknown>> = {};
    for (const [name, def] of Object.entries(servers)) {
      const { url, ...rest } = def;
      normalized[name] = {
        ...rest,
        ...(typeof url === 'string' ? { url: new URL(url) } : {}),
      };
    }

    const mcp = new MCPClient({ id: 'memclaw-mcp', servers: normalized as never });
    // listTools() namespaces tool names by server to avoid collisions.
    return (await mcp.listTools()) as Record<string, unknown>;
  },
});
