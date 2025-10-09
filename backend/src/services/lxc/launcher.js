/**
 * services/lxc/launcher.js
 * Minimal launcher used by controllers.launch.
 * - If env LXC_ENABLED === 'true' tries to exec `lxc` commands (best-effort).
 * - Otherwise returns a simulated container info object useful for dev/testing.
 *
 * Returns: { ip: string, ssh: { user, host, port, privateKey?(optional) }, hostKey?(optional) }
 */
const { exec } = require('child_process');
const util = require('util');
const execp = util.promisify(exec);

async function launchLabContainer({ name, dependencies = [], userPublicKey = null } = {}) {
  // If operator enabled LXC on host, try real LXC launch.
  if (process.env.LXC_ENABLED === 'true') {
    try {
      // Example: lxc launch ubuntu:24.04 <name>
      await execp(`lxc launch ubuntu:24.04 ${name}`);
      // Wait briefly then get IP (best-effort)
      const { stdout: ips } = await execp(`lxc list ${name} --format=json`);
      // parse minimal; fallback to loopback
      let ip = '127.0.0.1';
      try {
        const list = JSON.parse(ips);
        if (Array.isArray(list) && list[0] && list[0].state && list[0].state.network) {
          const nets = list[0].state.network;
          for (const k of Object.keys(nets)) {
            const addresses = nets[k].addresses || [];
            const a = addresses.find(x => x.scope === 'global' && x.family === 'inet');
            if (a && a.address) { ip = a.address; break; }
          }
        }
      } catch (e) {}
      return {
        ip,
        ssh: { user: 'ubuntu', host: ip, port: 22 },
        hostKey: null
      };
    } catch (err) {
      throw new Error('LXC launch failed: ' + (err.message || err));
    }
  }

  // Dev/test fallback: return simulated info
  const fakeIp = '127.0.0.1';
  const ssh = { user: 'ubuntu', host: fakeIp, port: 22 };
  return { ip: fakeIp, ssh, hostKey: null };
}

module.exports = { launchLabContainer };
