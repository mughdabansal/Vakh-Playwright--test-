---
name: vakh-staging-mcp
description: >-
  Interact with, inspect, and test the Eve Vakh Staging Model Context Protocol (MCP) server
  at https://xo.eve.vakh.com/mcp for backend tools, database operations, and schema evaluations.
---

# Eve Vakh Staging MCP Server Guide

This skill provides context and workflows for interacting with the **Eve Vakh Staging MCP Server** endpoint.

---

## 📌 Endpoint Details

- **MCP Server URL**: `https://xo.eve.vakh.com/mcp`
- **Protocol**: JSON-RPC 2.0 over HTTP Stream / SSE
- **OAuth Protected Resource**: `https://xo.eve.vakh.com/api/auth/.well-known/oauth-protected-resource`
- **Session Header**: `Mcp-Session-Id`
- **Staging Frontend Origin**: `https://eve.vakh.com`

---

## 🔐 Authentication Protocol

The MCP endpoint requires authentication. When calling the endpoint:

1. **Origin Header**: Include `Origin: https://eve.vakh.com` and `Referer: https://eve.vakh.com/`.
2. **Session / Bearer Token**: Obtain auth credentials from `https://xo.eve.vakh.com/api/auth/sign-in/email` with valid staging credentials.
3. **Session Tracking**: Capture and forward the `Mcp-Session-Id` header returned upon initialization.

---

## 🛠️ MCP JSON-RPC Operations

### 1. Initialize Handshake
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {
    "protocolVersion": "2024-11-05",
    "capabilities": {},
    "clientInfo": {
      "name": "antigravity-client",
      "version": "1.0.0"
    }
  }
}
```

### 2. List Available Tools
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/list",
  "params": {}
}
```

### 3. Call a Tool
```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "<tool_name>",
    "arguments": {}
  }
}
```
