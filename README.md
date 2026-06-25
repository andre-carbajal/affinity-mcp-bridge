# Affinity MCP Bridge

Use Affinity by Canva from any MCP-compatible assistant.

Affinity MCP Bridge is a small local bridge that lets clients like Claude Desktop, Codex, Cursor, or other MCP hosts connect to Affinity's built-in local MCP server without depending on Claude's private extension folder.

Instead of configuring a path like this:

```txt
C:\Users\<you>\AppData\Roaming\Claude\Claude Extensions\...
```

you can install this bridge once and point your MCP client to it.

## What You Can Do

When Affinity is open and its MCP server is enabled, your assistant can use Affinity tools through this bridge. Depending on the tools exposed by your Affinity version, this can include:

- Checking whether Affinity is reachable.
- Reading Affinity SDK documentation.
- Running scripts inside the current Affinity document.
- Rendering spreads or selections for visual verification.
- Working with Affinity's script library.

This bridge does not replace Affinity. It only connects your MCP client to the Affinity app running on your computer.

## Requirements

- Node.js 20 or newer.
- Affinity by Canva 3.2 or newer.
- Affinity running on the same computer.
- Affinity MCP enabled in **Settings > Model Context Protocol > Enable MCP server**.

After enabling the MCP server, restart Affinity.

By default, Affinity MCP Bridge connects to:

```txt
http://localhost:6767/sse
```

Most users do not need to change this.

## Quick Start

1. Open Affinity.
2. Enable **Settings > Model Context Protocol > Enable MCP server**.
3. Restart Affinity.
4. Configure your MCP client with one of the examples below.
5. Ask your assistant to run the `affinity_status` tool.

If `affinity_status` reports that Affinity is reachable, the bridge is working.

## Install From npm

If the package is available on npm, the easiest setup is to run it with `npx` from your MCP client:

```bash
npx -y affinity-mcp-bridge
```

You can also install it globally:

```bash
npm install -g affinity-mcp-bridge
```

Then use:

```bash
affinity-mcp-bridge
```

## Install From GitHub

If you want to use the GitHub version directly:

```bash
git clone https://github.com/andre-carbajal/affinity-mcp-bridge.git
cd affinity-mcp-bridge
npm install
npm run build
```

Then configure your MCP client to run:

```bash
node /absolute/path/to/affinity-mcp-bridge/dist/index.js
```

On Windows, use the full path to `node.exe` if your MCP client does not find `node` automatically.

## Claude Desktop

For npm or `npx` usage:

```json
{
  "mcpServers": {
    "affinity": {
      "command": "npx",
      "args": ["-y", "affinity-mcp-bridge"]
    }
  }
}
```

For a local GitHub clone:

```json
{
  "mcpServers": {
    "affinity": {
      "command": "node",
      "args": ["/absolute/path/to/affinity-mcp-bridge/dist/index.js"]
    }
  }
}
```

Windows example:

```json
{
  "mcpServers": {
    "affinity": {
      "command": "C:/Program Files/nodejs/node.exe",
      "args": ["C:/Users/you/path/to/affinity-mcp-bridge/dist/index.js"]
    }
  }
}
```

## Codex

Add this to your Codex `config.toml`.

For npm or `npx` usage:

```toml
[mcp_servers.affinity]
command = "npx"
args = ["-y", "affinity-mcp-bridge"]
startup_timeout_sec = 30
```

For a local GitHub clone:

```toml
[mcp_servers.affinity]
command = "C:/Program Files/nodejs/node.exe"
args = ["C:/absolute/path/to/affinity-mcp-bridge/dist/index.js"]
startup_timeout_sec = 30
```

## Custom Affinity URL

If your Affinity MCP server is not using the default URL, set `AFFINITY_MCP_SSE_URL`.

Claude Desktop example:

```json
{
  "mcpServers": {
    "affinity": {
      "command": "npx",
      "args": ["-y", "affinity-mcp-bridge"],
      "env": {
        "AFFINITY_MCP_SSE_URL": "http://localhost:6767/sse"
      }
    }
  }
}
```

Codex example:

```toml
[mcp_servers.affinity]
command = "npx"
args = ["-y", "affinity-mcp-bridge"]
startup_timeout_sec = 30

[mcp_servers.affinity.env]
AFFINITY_MCP_SSE_URL = "http://localhost:6767/sse"
```

## Test Your Setup

After configuring your MCP client, ask your assistant:

```txt
Use the affinity_status tool and tell me if Affinity is reachable.
```

Expected result:

- The bridge starts successfully.
- `affinity_status` is available.
- Affinity is reported as reachable when the app is open and MCP is enabled.

If Affinity is not reachable, the rest of the Affinity tools may not be available yet.

## Troubleshooting

### `affinity_status` says Affinity is not reachable

Check these items:

1. Affinity is open.
2. **Settings > Model Context Protocol > Enable MCP server** is enabled.
3. Affinity was restarted after enabling MCP.
4. No other app is blocking port `6767`.

On Windows, you can check the port owner with:

```powershell
Get-NetTCPConnection -LocalPort 6767 | ForEach-Object {
  Get-Process -Id $_.OwningProcess
}
```

If another app owns `127.0.0.1:6767` but Affinity owns `::1:6767`, keep the default `http://localhost:6767/sse`; do not force `127.0.0.1`.

### My MCP client cannot find `npx`

Use the full path to Node and run the local clone instead:

```json
{
  "mcpServers": {
    "affinity": {
      "command": "C:/Program Files/nodejs/node.exe",
      "args": ["C:/Users/you/path/to/affinity-mcp-bridge/dist/index.js"]
    }
  }
}
```

### I installed globally but the command does not start

Some Windows MCP clients handle `.cmd` launchers inconsistently. If that happens, prefer either:

- `npx -y affinity-mcp-bridge`
- `node C:/path/to/affinity-mcp-bridge/dist/index.js`

## For Developers

```bash
npm install
npm run build
npm run check
npm run smoke
```

`npm run smoke` starts the bridge and lists MCP tools. If Affinity is not reachable, it should still list `affinity_status`.

## License

MIT
