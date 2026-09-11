#!/usr/bin/env node

/**
 * Eve Vakh Staging MCP Stdio-to-HTTP Proxy Bridge
 * Facilitates bidirectional JSON-RPC MCP streaming between Antigravity (stdio)
 * and the remote Eve Vakh staging MCP server (https://xo.eve.vakh.com/mcp).
 */

const readline = require('readline');

const MCP_ENDPOINT = 'https://xo.eve.vakh.com/mcp';
const ORIGIN = 'https://eve.vakh.com';
let mcpSessionId = null;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

rl.on('line', async (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;

  try {
    const requestJson = JSON.parse(trimmed);

    const headers = {
      'Content-Type': 'application/json',
      'Origin': ORIGIN,
      'Referer': ORIGIN + '/'
    };

    if (mcpSessionId) {
      headers['Mcp-Session-Id'] = mcpSessionId;
    }

    const response = await fetch(MCP_ENDPOINT, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestJson)
    });

    const newSessionId = response.headers.get('mcp-session-id');
    if (newSessionId) {
      mcpSessionId = newSessionId;
    }

    const responseText = await response.text();
    if (responseText) {
      process.stdout.write(responseText + '\n');
    }
  } catch (error) {
    const errorResponse = {
      jsonrpc: '2.0',
      id: null,
      error: {
        code: -32603,
        message: 'Internal MCP Bridge Error: ' + error.message
      }
    };
    process.stdout.write(JSON.stringify(errorResponse) + '\n');
  }
});
