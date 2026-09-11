const { pool } = require('./pool');
const MIGRATION_SQL = require('./migration');

async function migrate() {
  console.log('Running database migrations...');
  try {
    await pool.query(MIGRATION_SQL);
    console.log('Migrations completed successfully.');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run directly if called as script
if (require.main === module) {
  migrate();
}

module.exports = { migrate };
