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

You can run it directly from GitHub:

```json
{
  "mcpServers": {
    "affinity": {
      "command": "npx",
      "args": ["-y", "github:andre-carbajal/affinity-mcp-bridge"]
    }
  }
}
```

Or install it globally:

```bash
npm install -g github:andre-carbajal/affinity-mcp-bridge
```

Then configure your MCP client:

```json
{
  "mcpServers": {
    "affinity": {
      "command": "affinity-mcp-bridge"
    }
  }
}
```

### Codex `config.toml`

```toml
[mcp_servers.affinity]
command = "npx"
args = ["-y", "github:andre-carbajal/affinity-mcp-bridge"]

[mcp_servers.affinity.env]
AFFINITY_MCP_SSE_URL = "http://localhost:6767/sse"
```

If you installed globally:

```toml
[mcp_servers.affinity]
command = "affinity-mcp-bridge"
```

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
