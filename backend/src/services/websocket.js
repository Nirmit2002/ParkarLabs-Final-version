// backend/src/services/websocket.js
/**
 * WebSocket service for Web SSH.
 *
 * Exports initWebsocket(server) which attaches a WebSocket server
 * at path /ws/ssh to the provided http server.
 *
 * Behavior:
 *  - Expects JSON messages from the client (single-line compact JSON).
 *  - Supported types:
 *      { type: "connect", token, containerId }
 *      { type: "input", data }
 *      { type: "resize", cols, rows }
 *      { type: "close" }
 *
 *  - If env LXC_SSH_ENABLED === 'true' and ssh2 present, will try SSH to container.
 *  - If DEV_SSH_FALLBACK === 'true' (recommended for local dev), will spawn a local shell
 *    (bash/sh) and proxy it (no node-pty dependency).
 *
 * Notes:
 *  - This file intentionally avoids node-pty so it runs in simple dev envs.
 *  - For production real-SSH use, ensure you install `ssh2` and allow ssh mode.
 */

const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const { spawn } = require('child_process');

let serverAttached = false;

function safeParseJson(text) {
  try {
    return JSON.parse(text);
  } catch (e) {
    return null;
  }
}

function sendJson(ws, obj) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    try {
      ws.send(JSON.stringify(obj));
    } catch (e) {
      // ignore
    }
  }
}

function verifyToken(token) {
  if (!token) throw new Error('No token provided');
  const secret = process.env.JWT_SECRET || 'parkarlabs_jwt_secret_key_2024';
  try {
    return jwt.verify(token, secret);
  } catch (e) {
    throw new Error('Invalid token');
  }
}

function initWebsocket(server) {
  if (serverAttached) return;
  const wss = new WebSocket.Server({ server, path: '/ws/ssh' });

  wss.on('connection', (ws, req) => {
    ws.isAuthed = false;
    ws.remote = req.socket.remoteAddress;

    // Holder for process / ssh connection
    let childProc = null;
    let sshClient = null;
    let connectedContainerId = null;

    sendJson(ws, { type: 'welcome', message: 'Send connect JSON {type: "connect", token, containerId}' });

    ws.on('message', async (raw) => {
      // some clients (wscat) may send strings/newlines — ensure we have string
      const text = typeof raw === 'string' ? raw.trim() : raw.toString('utf8').trim();
      const msg = safeParseJson(text);
      if (!msg) {
        return sendJson(ws, { type: 'error', message: 'Invalid JSON' });
      }

      const { type } = msg;
      if (!type) return sendJson(ws, { type: 'error', message: 'Missing message type' });

      // CONNECT
      if (type === 'connect') {
        if (ws.isAuthed) {
          sendJson(ws, { type: 'error', message: 'Already connected' });
          return;
        }

        const { token, containerId } = msg;
        if (!token) return sendJson(ws, { type: 'error', message: 'No token' });

        // verify token (throws on bad)
        let decoded;
        try {
          decoded = verifyToken(token);
        } catch (err) {
          sendJson(ws, { type: 'error', message: 'Invalid token' });
          return ws.close(4001, 'auth error');
        }

        // Optionally: check container ownership in DB here (left as TODO)
        ws.user = decoded;
        ws.isAuthed = true;
        connectedContainerId = containerId || null;

        // Decide mode: real SSH using ssh2 (if available & enabled), else fallback shell
        const useSsh2 = (process.env.LXC_SSH_ENABLED === 'true');
        if (useSsh2) {
          // try to dynamically require ssh2 (best-effort)
          let Client;
          try {
            Client = require('ssh2').Client;
          } catch (e) {
            sendJson(ws, { type: 'error', message: 'ssh2 not installed on server; falling back to local shell' });
          }

          if (Client) {
            // If you want to actually SSH into container, implement here.
            // Minimal example omitted because production SSH requires keys and network access.
            sendJson(ws, { type: 'error', message: 'SSH mode not implemented in this file; enable DEV_FALLBACK or implement ssh2 connection' });
            return;
          }
        }

        // DEV fallback: spawn local shell (works for development)
        if (process.env.DEV_SSH_FALLBACK === 'true' || process.env.NODE_ENV === 'development') {
          // spawn interactive shell
          const shell = process.env.SHELL || '/bin/bash';
          childProc = spawn(shell, ['-i'], {
            stdio: 'pipe',
            env: Object.assign({}, process.env, { USER: decoded.email || decoded.userId || 'dev' }),
          });

          childProc.stdout.on('data', (chunk) => {
            sendJson(ws, { type: 'data', data: chunk.toString('utf8') });
          });
          childProc.stderr.on('data', (chunk) => {
            sendJson(ws, { type: 'data', data: chunk.toString('utf8') });
          });
          childProc.on('exit', (code) => {
            sendJson(ws, { type: 'close', code });
            try { ws.close(); } catch (e) {}
          });

          // now mark connected
          sendJson(ws, { type: 'ready', message: 'Connected (dev fallback) - you can type now' });
          // also print an intro
          sendJson(ws, { type: 'data', data: `\r\n*** Connected to shell (dev fallback) as ${decoded.email || decoded.userId} ***\r\n` });

          // Save childProc for input handling
          ws._pty = childProc;
          return;
        }

        // If reached here, no mode available
        sendJson(ws, { type: 'error', message: 'No available connection mode (enable DEV_SSH_FALLBACK or implement ssh2 mode)' });
        return;
      }

      // All other message types need auth
      if (!ws.isAuthed) {
        return sendJson(ws, { type: 'error', message: 'Not authenticated' });
      }

      // INPUT: data to child/ssh
      if (type === 'input') {
        const { data } = msg;
        if (!data) return;

        if (ws._pty && ws._pty.stdin && !ws._pty.killed) {
          try {
            ws._pty.stdin.write(data);
          } catch (e) {
            sendJson(ws, { type: 'error', message: 'Failed to write to shell' });
          }
        } else {
          sendJson(ws, { type: 'error', message: 'Not connected' });
        }
        return;
      }

      // RESIZE: for pty-aware servers (not used in simple spawn). Provided for completeness.
      if (type === 'resize') {
        // message: { type:'resize', cols, rows }
        const { cols, rows } = msg;
        // if using node-pty or ssh pty, set size. For spawn without pty, no-op.
        sendJson(ws, { type: 'info', message: 'Resize request received (no-op in fallback)' });
        return;
      }

      if (type === 'close') {
        // end underlying process
        if (ws._pty) {
          try { ws._pty.kill(); } catch (e) {}
        }
        sendJson(ws, { type: 'closing' });
        try { ws.close(); } catch (e) {}
        return;
      }

      // unknown type
      sendJson(ws, { type: 'error', message: 'Unknown message type' });
    });

    ws.on('close', () => {
      // cleanup
      if (ws._pty && !ws._pty.killed) {
        try { ws._pty.kill(); } catch (e) {}
      }
      if (sshClient && sshClient.end) {
        try { sshClient.end(); } catch (e) {}
      }
    });

    ws.on('error', (err) => {
      // nothing fancy
      console.warn('WS error', err && err.message);
    });
  });

  serverAttached = true;
  console.log('WebSocket /ws/ssh initialized');

  return wss;
}

module.exports = { initWebsocket };
