// seeds/run-seeds-full.js
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
    // default roles
    await client.query(`INSERT INTO roles (name, description) VALUES
      ('admin','Full system access'),
      ('manager','Manage courses and assignments'),
      ('employee','Consume courses and use lab')
      ON CONFLICT DO NOTHING;`);

    // default permissions (simple)
    await client.query(`INSERT INTO permissions (name, description) VALUES
      ('courses:manage','Create/edit/delete courses'),
      ('assignments:manage','Assign tasks to users'),
      ('containers:manage','Provision/stop containers'),
      ('users:manage','Create/edit users & teams')
      ON CONFLICT DO NOTHING;`);

    // link admin -> all permissions
    const admin = await client.query(`SELECT id FROM roles WHERE name='admin' LIMIT 1`);
    if (admin.rows.length) {
      const adminId = admin.rows[0].id;
      const permRes = await client.query(`SELECT id FROM permissions`);
      for (const p of permRes.rows) {
        await client.query(`INSERT INTO role_permissions (role_id, permission_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [adminId, p.id]);
      }
    }

    // create a default admin user if not exists
    const adminUser = await client.query(`SELECT id FROM users WHERE email='admin@local' LIMIT 1`);
    if (!adminUser.rows.length) {
      const roleId = (await client.query(`SELECT id FROM roles WHERE name='admin' LIMIT 1`)).rows[0].id;
      const res = await client.query(
        `INSERT INTO users(azure_ad_id, name, email, role_id) VALUES ($1,$2,$3,$4) RETURNING id`,
        ['admin-azure', 'Admin User', 'admin@local', roleId]
      );
      console.log('Created admin user id', res.rows[0].id);
    }

    // dependency presets (basic MERN)
    await client.query(`
      INSERT INTO dependency_sets (name, description, script, created_at)
      VALUES ('MERN','MongoDB + Node + npm environment','#!/bin/bash\napt update && apt install -y nodejs npm mongodb', NOW())
      ON CONFLICT DO NOTHING;
    `);

    // default template
    await client.query(`
      INSERT INTO templates (name, image, default_cpu, default_memory_mb, default_disk_mb, network_profile, init_script, created_at)
      VALUES ('ubuntu-24-default','ubuntu:24.04',1,2048,20480,'bridge','#!/bin/bash\n# init\n', NOW())
      ON CONFLICT DO NOTHING;
    `);

    console.log('Full seeds applied');
  } catch (e) {
    console.error(e);
  } finally {
    await client.end();
  }
})();
