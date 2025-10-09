/* 1695471800000_search_indexes.js
   Adds trigram / tsvector indexes for search performance
*/
exports.shorthands = undefined;

exports.up = (pgm) => {
  // ensure pg_trgm extension
  pgm.sql("CREATE EXTENSION IF NOT EXISTS pg_trgm;");

  // users: trigram on email and name
  pgm.sql("CREATE INDEX IF NOT EXISTS users_email_trgm_idx ON users USING gin (email gin_trgm_ops);");
  pgm.sql("CREATE INDEX IF NOT EXISTS users_name_trgm_idx ON users USING gin (name gin_trgm_ops);");

  // courses: full text search vector already created by earlier migrations, ensure index exists
  pgm.sql("CREATE INDEX IF NOT EXISTS courses_search_idx ON courses USING gin(search_vector);");
};

exports.down = (pgm) => {
  pgm.sql("DROP INDEX IF EXISTS users_email_trgm_idx;");
  pgm.sql("DROP INDEX IF EXISTS users_name_trgm_idx;");
  pgm.sql("DROP INDEX IF EXISTS courses_search_idx;");
};
