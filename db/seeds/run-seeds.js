// seeds/run-seeds.js
require('dotenv').config();
const { Client } = require('pg');

const client = new Client({
  host: process.env.PGHOST,
  port: process.env.PGPORT,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
});

const roles = [
  { name: 'admin', description: 'Full system access' },
  { name: 'manager', description: 'Manage courses and assignments' },
  { name: 'employee', description: 'Consume courses and use lab' }
];

const permissions = [
  { name: 'courses:manage', description: 'Create/edit/delete courses' },
  { name: 'assignments:manage', description: 'Assign tasks to users' },
  { name: 'containers:manage', description: 'Provision/stop containers' },
  { name: 'users:manage', description: 'Create/edit users & teams' }
];

(async () => {
  await client.connect();
  try {
    for (const r of roles) {
      await client.query(
        `INSERT INTO roles(name, description) VALUES($1,$2) ON CONFLICT (name) DO NOTHING`,
        [r.name, r.description]
      );
    }
    for (const p of permissions) {
      await client.query(
        `INSERT INTO permissions(name, description) VALUES($1,$2) ON CONFLICT (name) DO NOTHING`,
        [p.name, p.description]
      );
    }
    // link admin -> all permissions
    const res = await client.query(`SELECT id FROM roles WHERE name = 'admin'`);
    if (res.rows.length) {
      const adminId = res.rows[0].id;
      const permRows = await client.query(`SELECT id FROM permissions`);
      for (const pr of permRows.rows) {
        await client.query(
          `INSERT INTO role_permissions(role_id, permission_id) VALUES($1,$2) ON CONFLICT DO NOTHING`,
          [adminId, pr.id]
        );
      }
    }
    console.log('Seeds applied');
  } catch (err) {
    console.error(err);
    process.exit(1);
  } finally {
    await client.end();
  }
})();
