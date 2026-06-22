import { spawn } from "node:child_process";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const transport = new StdioClientTransport({
  command: process.execPath,
  args: ["src/index.js"],
  env: {
    ...process.env,
    AFFINITY_MCP_SSE_URL:
      process.env.AFFINITY_MCP_SSE_URL ?? "http://localhost:6767/sse",
  },
  stderr: "pipe",
});

const client = new Client({ name: "affinity-mcp-bridge-smoke", version: "0.1.0" });
await client.connect(transport);

try {
  const tools = await client.listTools();
  console.log(JSON.stringify(tools.tools.map((tool) => tool.name), null, 2));
} finally {
  await client.close();
}
