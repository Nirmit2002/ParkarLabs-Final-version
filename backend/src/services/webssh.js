const { Server } = require("ws");
const { Client } = require("ssh2");

function initWebSSH(server) {
  const wss = new Server({ server, path: "/ws/ssh" });

  wss.on("connection", (ws, req) => {
    console.log("New WS connection for SSH");

    const conn = new Client();

    ws.on("message", (msg) => {
      try {
        const data = JSON.parse(msg);
        if (data.type === "connect") {
          conn
            .on("ready", () => {
              conn.shell((err, stream) => {
                if (err) return ws.send(JSON.stringify({ type: "error", message: err.message }));
                ws.send(JSON.stringify({ type: "ready" }));

                stream.on("data", (chunk) => {
                  ws.send(JSON.stringify({ type: "data", data: chunk.toString("utf8") }));
                });

                ws.on("message", (m) => {
                  const cmd = JSON.parse(m);
                  if (cmd.type === "input") {
                    stream.write(cmd.data);
                  }
                });
              });
            })
            .connect({
              host: data.host,
              port: data.port || 22,
              username: data.user,
              privateKey: data.privateKey // ya password: data.password
            });
        }
      } catch (err) {
        console.error("WS parse error:", err);
      }
    });

    ws.on("close", () => conn.end());
  });
}

module.exports = { initWebSSH };
