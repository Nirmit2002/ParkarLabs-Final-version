// backend/src/services/lxc/launcher.js
const { spawn } = require('child_process');
const { promises: fs } = require('fs');
const path = require('path');
const os = require('os');

const WAIT_IP_TIMEOUT_MS = 120_000; // wait up to 2 min
const SSH_USER = 'labuser';
const SSH_PORT = 22;

const DEP_MAP = {
  node: { label: 'Node.js 20.x', cloudInit: `
  - curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  - apt-get install -y nodejs
  `},
  postgresql: { label: 'PostgreSQL 16', cloudInit: `
  - apt-get install -y postgresql postgresql-contrib
  `},
  nginx: { label: 'Nginx', cloudInit: `
  - apt-get install -y nginx
  `},
  redis: { label: 'Redis 7', cloudInit: `
  - apt-get install -y redis-server
  `},
  docker: { label: 'Docker (docker.io)', cloudInit: `
  - apt-get install -y docker.io
  - usermod -aG docker ${SSH_USER} || true
  `},
  mongodb: { label: 'MongoDB', cloudInit: `
  - apt-get install -y mongodb
  `},
};

// small helper to run a command and capture stdout
function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: ['ignore','pipe','pipe'], ...opts });
    let out = ''; let err = '';
    p.stdout.on('data', d => out += d.toString());
    p.stderr.on('data', d => err += d.toString());
    p.on('close', code => {
      if (code === 0) return resolve(out.trim());
      reject(new Error(`${cmd} ${args.join(' ')}\nexit ${code}\n${err}`));
    });
  });
}

async function ensureSshKeyPair(userProvidedPubKey) {
  if (userProvidedPubKey) return { privateKey: null, publicKey: userProvidedPubKey, generated: false };

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'labkey-'));
  const keyPath = path.join(tmpDir, 'id_ed25519');
  await run('ssh-keygen', ['-t','ed25519','-N','', '-f', keyPath]);
  const [priv, pub] = await Promise.all([
    fs.readFile(keyPath, 'utf8'),
    fs.readFile(keyPath + '.pub', 'utf8')
  ]);
  return { privateKey: priv, publicKey: pub.trim(), generated: true };
}

function buildCloudInitYaml(selectedDeps, sshPublicKey) {
  // Build runcmd snippets
  const depCmds = selectedDeps
    .filter(k => DEP_MAP[k])
    .map(k => DEP_MAP[k].cloudInit)
    .join('\n');

  return `#cloud-config
package_update: true
package_upgrade: true
packages:
  - curl
  - wget
  - ca-certificates
  - gnupg
  - software-properties-common
  - openssh-server
users:
  - name: ${SSH_USER}
    sudo: ALL=(ALL) NOPASSWD:ALL
    shell: /bin/bash
    ssh_authorized_keys:
      - ${sshPublicKey}
ssh_pwauth: false
runcmd:
  - systemctl enable ssh
  - systemctl restart ssh
${depCmds}
`;
}

async function launchLxcWithCloudInit(name, cloudInitYaml) {
  // Write cloud-init to temp file
  const cloudPath = path.join(os.tmpdir(), `cloudinit-${name}.yaml`);
  await fs.writeFile(cloudPath, cloudInitYaml, 'utf8');

  // launch with user.user-data
  // Note: requires the backend process user to be in `lxd` group or run with sufficient privileges.
  await run('lxc', ['launch', 'ubuntu:24.04', name, '-c', `user.user-data=$(cat ${cloudPath})`], { shell: true });

  return cloudPath;
}

async function waitForContainerIP(name, timeoutMs = WAIT_IP_TIMEOUT_MS) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const info = await run('lxc', ['list', name, '--format', 'json']);
    try {
      const arr = JSON.parse(info);
      if (arr[0] && arr[0].state && arr[0].state.network) {
        const nets = arr[0].state.network;
        for (const n of Object.values(nets)) {
          if (Array.isArray(n.addresses)) {
            const ipv4 = n.addresses.find(a => a.family === 'inet' && a.scope === 'global');
            if (ipv4 && ipv4.address) return ipv4.address;
          }
        }
      }
    } catch {}
    await new Promise(r => setTimeout(r, 2000));
  }
  throw new Error('Timed out waiting for container IP');
}

async function getFingerprint(name) {
  try {
    const out = await run('lxc', ['exec', name, '--', 'ssh-keyscan', '-t', 'ed25519', 'localhost']);
    return out.trim();
  } catch {
    return null;
  }
}

/**
 * Main entry: launches a container based on selected dependencies.
 * @param {Object} opts
 * @param {string} opts.name
 * @param {string[]} opts.dependencies - keys from DEP_MAP (e.g., ['node','postgresql'])
 * @param {string|null} opts.userPublicKey - SSH pubkey to inject; if null we generate a keypair
 */
async function launchLabContainer({ name, dependencies, userPublicKey }) {
  const keyPair = await ensureSshKeyPair(userPublicKey);
  const cloudInit = buildCloudInitYaml(dependencies, keyPair.publicKey);
  await launchLxcWithCloudInit(name, cloudInit);
  const ip = await waitForContainerIP(name);
  const hostKey = await getFingerprint(name);

  return {
    name,
    ip,
    ssh: { user: SSH_USER, port: SSH_PORT, host: ip, privateKey: keyPair.privateKey, generatedKey: keyPair.generated },
    hostKey,
  };
}

module.exports = {
  launchLabContainer,
  buildCloudInitYaml,
};
