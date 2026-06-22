# Affinity MCP Bridge

A standalone MCP stdio bridge for Affinity by Canva's local MCP server.

This lets MCP clients connect to Affinity without depending on Claude Desktop's installed extension path, such as:

```txt
C:\Users\<you>\AppData\Roaming\Claude\Claude Extensions\...
```

The bridge starts as a normal stdio MCP server, then forwards tools, resources, and prompts to Affinity's local SSE server.

## Requirements

- Node.js 20 or newer.
- Affinity by Canva 3.2 or newer.
- Affinity running with **Settings > Model Context Protocol > Enable MCP server** turned on.
- Restart Affinity after enabling the MCP server.

By default, the bridge connects to:

```txt
http://localhost:6767/sse
```

You can override it with `AFFINITY_MCP_SSE_URL`.

## Use From GitHub

Clone the repository and install dependencies:

```bash
git clone https://github.com/andre-carbajal/affinity-mcp-bridge.git
cd affinity-mcp-bridge
npm install
```

Then configure your MCP client to run `src/index.js` with Node.

### Claude Desktop

```json
{
  "mcpServers": {
    "affinity": {
      "command": "node",
      "args": ["/absolute/path/to/affinity-mcp-bridge/src/index.js"],
      "env": {
        "AFFINITY_MCP_SSE_URL": "http://localhost:6767/sse"
      }
    }
  }
}
```

On Windows, use forward slashes or escaped backslashes:

```json
{
  "mcpServers": {
    "affinity": {
      "command": "C:/Program Files/nodejs/node.exe",
      "args": ["C:/Users/you/path/to/affinity-mcp-bridge/src/index.js"],
      "env": {
        "AFFINITY_MCP_SSE_URL": "http://localhost:6767/sse"
      }
    }
  }
}
```

### Codex `config.toml`

```toml
[mcp_servers.affinity]
command = "C:/Program Files/nodejs/node.exe"
args = ["C:/absolute/path/to/affinity-mcp-bridge/src/index.js"]
startup_timeout_sec = 30

[mcp_servers.affinity.env]
AFFINITY_MCP_SSE_URL = "http://localhost:6767/sse"
```

### Optional Global Install

You can also install from GitHub globally:

```bash
npm install -g github:andre-carbajal/affinity-mcp-bridge
```

Then find the global package path:

```bash
npm root -g
```

Use that path with `node`, for example:

```txt
<npm-root-global>/affinity-mcp-bridge/src/index.js
```

For Windows MCP clients, calling `node` with the JS file path is more reliable than launching npm's `.cmd` wrapper directly.

## Tools

The bridge exposes:

- `affinity_status`: local diagnostic tool that checks whether Affinity MCP is reachable.
- All tools reported by Affinity's upstream MCP server, when Affinity is running.

Typical upstream tools include script execution, rendering the current spread/selection, SDK documentation access, and Affinity script-library operations.

## Troubleshooting

If `affinity_status` says the bridge cannot connect:

1. Open Affinity by Canva.
2. Enable **Settings > Model Context Protocol > Enable MCP server**.
3. Restart Affinity.
4. Check whether another local app is occupying port `6767`.

On Windows, you can check the port owner with:

```powershell
Get-NetTCPConnection -LocalPort 6767 | ForEach-Object {
  Get-Process -Id $_.OwningProcess
}
```

If another app owns `127.0.0.1:6767` but Affinity owns `::1:6767`, keep the default `http://localhost:6767/sse`; do not force `127.0.0.1`.

## Development

```bash
npm install
npm run check
npm run smoke
```

`npm run smoke` starts the bridge and lists MCP tools. If Affinity is not reachable, it should still list `affinity_status`.

## License

MIT
