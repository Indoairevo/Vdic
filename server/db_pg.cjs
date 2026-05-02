const { Pool } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL || process.env.PGURI || null;

if (!connectionString) {
  module.exports = null;
} else {
  const pool = new Pool({ connectionString });

  module.exports = {
    query: (text, params) => pool.query(text, params),
    pool,
  };
}
