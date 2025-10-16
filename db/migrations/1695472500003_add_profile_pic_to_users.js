// Migration: Add profile_pic column to users table
exports.up = async (client) => {
  await client.query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS profile_pic TEXT;
  `);

  console.log('Added profile_pic column to users table');
};

exports.down = async (client) => {
  await client.query(`
    ALTER TABLE users
    DROP COLUMN IF EXISTS profile_pic;
  `);

  console.log('Removed profile_pic column from users table');
};
