exports.up = async (client) => {
  console.log('Adding unique constraint on user_id to local_auth table...');

  // Add unique constraint on user_id
  await client.query(`
    ALTER TABLE local_auth
    ADD CONSTRAINT local_auth_user_id_key UNIQUE (user_id);
  `);

  console.log('✅ Unique constraint added successfully');
};

exports.down = async (client) => {
  console.log('Removing unique constraint on user_id from local_auth table...');

  await client.query(`
    ALTER TABLE local_auth
    DROP CONSTRAINT IF EXISTS local_auth_user_id_key;
  `);

  console.log('✅ Unique constraint removed');
};
