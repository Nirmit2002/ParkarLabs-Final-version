require("dotenv").config();

module.exports = {
  migrationFolder: "./migrations",
  direction: "up",
  databaseUrl: {
    host: process.env.PGHOST,
    port: process.env.PGPORT,
    database: process.env.PGDATABASE,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
  },
};
