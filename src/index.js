#!/usr/bin/env node

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  GetPromptRequestSchema,
  ListPromptsRequestSchema,
  ListResourceTemplatesRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const VERSION = "0.1.0";
const DEFAULT_SSE_URL = "http://localhost:6767/sse";
const CONNECT_TIMEOUT_MS = Number.parseInt(
  process.env.AFFINITY_MCP_CONNECT_TIMEOUT_MS ?? "5000",
  10,
);
const SSE_URL = process.env.AFFINITY_MCP_SSE_URL ?? DEFAULT_SSE_URL;

let upstream = null;
let upstreamCaps = {};
let lastError = null;

const statusTool = {
  name: "affinity_status",
  description:
    "Check whether the bridge can connect to Affinity by Canva's local MCP server.",
  inputSchema: {
    type: "object",
    properties: {},
    additionalProperties: false,
  },
  annotations: {
    title: "Check Affinity MCP status",
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
};

function errorMessage(error) {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

function connectionHelp() {
  return [
    `Could not connect to Affinity MCP at ${SSE_URL}.`,
    "",
    "Make sure:",
    "- Affinity by Canva 3.2 or newer is running.",
    "- Settings > Model Context Protocol > Enable MCP server is turned on.",
    "- Affinity was restarted after enabling MCP.",
    "- No other app is occupying the same host/port.",
    "",
    "If another local app uses 127.0.0.1:6767 but Affinity listens on ::1, keep the default URL as http://localhost:6767/sse.",
    "Override with AFFINITY_MCP_SSE_URL only when Affinity is configured to use a different endpoint.",
  ].join("\n");
}

function connectWithTimeout(client, transport, timeoutMs) {
  return Promise.race([
    client.connect(transport),
    new Promise((_, reject) => {
      setTimeout(
        () => reject(new Error(`Connection timed out after ${timeoutMs} ms`)),
        timeoutMs,
      );
    }),
  ]);
}

async function closeUpstream() {
  if (upstream) {
    try {
      await upstream.close();
    } catch {
      // Ignore shutdown errors; the next request will reconnect.
    }
  }
  upstream = null;
  upstreamCaps = {};
}

async function freshConnect() {
  await closeUpstream();

  const transport = new SSEClientTransport(new URL(SSE_URL));
  const client = new Client(
    { name: "affinity-mcp-bridge", version: VERSION },
    { capabilities: {} },
  );

  await connectWithTimeout(client, transport, CONNECT_TIMEOUT_MS);
  upstream = client;
  upstreamCaps = client.getServerCapabilities() ?? {};
  lastError = null;
  return client;
}

async function getUpstream() {
  if (!upstream) {
    return freshConnect();
  }
  return upstream;
}

async function callWithReconnect(fn) {
  const client = await getUpstream();
  try {
    return await fn(client);
  } catch (firstError) {
    try {
      const freshClient = await freshConnect();
      return await fn(freshClient);
    } catch (retryError) {
      lastError = retryError;
      if (!lastError) {
        lastError = firstError;
      }
      throw retryError;
    }
  }
}

async function buildStatusResult() {
  try {
    const tools = await callWithReconnect((client) => client.listTools());
    return {
      content: [
        {
          type: "text",
          text: `Connected to Affinity MCP at ${SSE_URL}. Found ${tools.tools.length} upstream tools.`,
        },
      ],
      structuredContent: {
        connected: true,
        sseUrl: SSE_URL,
        upstreamToolCount: tools.tools.length,
        upstreamTools: tools.tools.map((tool) => tool.name),
      },
    };
  } catch (error) {
    return {
      isError: true,
      content: [
        {
          type: "text",
          text: `${connectionHelp()}\n\nLast error: ${errorMessage(error)}`,
        },
      ],
      structuredContent: {
        connected: false,
        sseUrl: SSE_URL,
        lastError: errorMessage(error),
      },
    };
  }
}

const server = new Server(
  { name: "affinity-mcp-bridge", version: VERSION },
  {
    capabilities: {
      tools: {},
      resources: {},
      prompts: {},
    },
  },
);

server.setRequestHandler(ListToolsRequestSchema, async (request) => {
  try {
    const result = await callWithReconnect((client) =>
      client.listTools(request.params),
    );
    return {
      tools: [statusTool, ...result.tools.filter((tool) => tool.name !== statusTool.name)],
    };
  } catch (error) {
    lastError = error;
    return { tools: [statusTool] };
  }
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === statusTool.name) {
    return buildStatusResult();
  }

  try {
    return await callWithReconnect((client) => client.callTool(request.params));
  } catch (error) {
    lastError = error;
    return {
      isError: true,
      content: [
        {
          type: "text",
          text: `${connectionHelp()}\n\nLast error: ${errorMessage(error)}`,
        },
      ],
    };
  }
});

server.setRequestHandler(ListResourcesRequestSchema, async (request) => {
  try {
    return await callWithReconnect((client) => {
      if (!upstreamCaps.resources) {
        return { resources: [] };
      }
      return client.listResources(request.params);
    });
  } catch {
    return { resources: [] };
  }
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  return callWithReconnect((client) => client.readResource(request.params));
});

server.setRequestHandler(ListResourceTemplatesRequestSchema, async (request) => {
  try {
    return await callWithReconnect((client) => {
      if (!upstreamCaps.resources) {
        return { resourceTemplates: [] };
      }
      return client.listResourceTemplates(request.params);
    });
  } catch {
    return { resourceTemplates: [] };
  }
});

server.setRequestHandler(ListPromptsRequestSchema, async (request) => {
  try {
    return await callWithReconnect((client) => {
      if (!upstreamCaps.prompts) {
        return { prompts: [] };
      }
      return client.listPrompts(request.params);
    });
  } catch {
    return { prompts: [] };
  }
});

server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  return callWithReconnect((client) => client.getPrompt(request.params));
});

async function shutdown() {
  await closeUpstream();
  await server.close();
}

process.on("SIGINT", async () => {
  await shutdown();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await shutdown();
  process.exit(0);
});

const transport = new StdioServerTransport();
await server.connect(transport);
