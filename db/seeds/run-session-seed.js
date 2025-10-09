// seeds/run-session-seed.js
require('dotenv').config();
const { Client } = require('pg');

(async () => {
  const client = new Client({
    host: process.env.PGHOST,
    port: process.env.PGPORT,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE,
  });
  await client.connect();

  try {
    // No default seed needed; but create sample ephemeral key for dev_user (if exists)
    const res = await client.query(`SELECT id FROM users LIMIT 1`);
    if (res.rows.length) {
      const uid = res.rows[0].id;
      await client.query(
        `INSERT INTO ssh_keys(user_id, key_type, public_key, label, ephemeral, expires_at) VALUES ($1,$2,$3,$4,$5,$6)`,
        [uid, 'ssh-ed25519', 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIExampleKeyForDev', 'dev-temp', true, new Date(Date.now() + 3600 * 1000).toISOString()]
      );
      console.log('Inserted a sample ephemeral SSH key for user', uid);
    } else {
      console.log('No users found to seed ssh_keys.');
    }
  } catch (e) {
    console.error(e);
  } finally {
    await client.end();
  }
})();
