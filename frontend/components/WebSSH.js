// frontend/components/WebSSH.js
import { useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';

// xterm requires browser, we dynamically import CSS at runtime
let Terminal, FitAddon;
if (typeof window !== 'undefined') {
  // dynamic require to avoid SSR issues
  // eslint-disable-next-line global-require
  Terminal = require('xterm').Terminal;
  // eslint-disable-next-line global-require
  FitAddon = require('xterm-addon-fit').FitAddon;
  // Ensure CSS is loaded
  require('xterm/css/xterm.css');
}

export default function WebSSH({ token, containerId, wsUrl = 'ws://localhost:5000/ws/ssh', fontSize = 14 }) {
  const elRef = useRef(null);
  const termRef = useRef(null);
  const wsRef = useRef(null);
  const fitRef = useRef(null);
  const roRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !elRef.current) return;

    // create terminal
    const term = new Terminal({
      cursorBlink: true,
      fontSize,
      convertEol: true
    });
    const fit = new FitAddon();
    term.loadAddon(fit);

    term.open(elRef.current);
    fit.fit(); // initial fit

    term.writeln('\x1b[33mConnecting to remote...\x1b[0m\r\n');
    term.writeln('Send connect JSON {type: "connect", token, containerId}\r\n');

    termRef.current = term;
    fitRef.current = fit;

    // ResizeObserver to call fit whenever container size changes
    try {
      const ro = new ResizeObserver(() => {
        // guard
        if (fitRef.current) {
          try { fitRef.current.fit(); } catch (e) { /* ignore */ }
        }
      });
      ro.observe(elRef.current);
      roRef.current = ro;
    } catch (e) {
      // older browsers: fallback to window resize
      const onresize = () => fit.fit();
      window.addEventListener('resize', onresize);
      roRef.current = { disconnect: () => window.removeEventListener('resize', onresize) };
    }

    // connect WebSocket
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      term.writeln('\x1b[32mConnected — waiting for handshake (send connect JSON)...\x1b[0m\r\n');
      // If token + containerId were provided, auto-send connect message:
      if (token && containerId) {
        const connectMsg = JSON.stringify({ type: 'connect', token, containerId });
        ws.send(connectMsg);
      }
    };

    ws.onmessage = (ev) => {
      // server expected to send JSON lines with types
      let msg;
      try {
        msg = JSON.parse(ev.data);
      } catch (err) {
        // fallback: treat as raw data
        term.write(ev.data);
        return;
      }

      if (msg.type === 'data' && typeof msg.data === 'string') {
        term.write(msg.data);
      } else if (msg.type === 'ready') {
        term.writeln('\r\n\x1b[32mConnected — you can type now\x1b[0m\r\n');
      } else if (msg.type === 'error') {
        term.writeln(`\r\n\x1b[31mWebSocket error: ${msg.message}\x1b[0m\r\n`);
      } else if (msg.type === 'close') {
        term.writeln('\r\n\x1b[33mDisconnected\x1b[0m\r\n');
      } else if (msg.type === 'info' && msg.message) {
        term.writeln(`\r\n\x1b[34m${msg.message}\x1b[0m\r\n`);
      }
    };

    ws.onerror = (e) => {
      term.writeln('\r\n\x1b[31mWebSocket error\x1b[0m\r\n');
    };

    ws.onclose = () => {
      term.writeln('\r\n\x1b[33mWebSocket closed\x1b[0m\r\n');
    };

    // terminal input -> send JSON {type:'input', data: '...'}
    term.onData((data) => {
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        term.write('\r\n\x1b[31mNot connected\x1b[0m\r\n');
        return;
      }
      ws.send(JSON.stringify({ type: 'input', data }));
    });

    return () => {
      try { ws.close(); } catch (e) {}
      try { term.dispose(); } catch (e) {}
      try { roRef.current && roRef.current.disconnect && roRef.current.disconnect(); } catch (e) {}
    };
  }, [token, containerId, wsUrl, fontSize]);

  return (
    <div style={{ width: '100%', height: '500px', background: 'black', position: 'relative' }}>
      <div ref={elRef} style={{ width: '100%', height: '100%', outline: 'none' }} />
    </div>
  );
}
