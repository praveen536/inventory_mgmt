const app = require('./app');
const config = require('./config');
const { pool } = require('./db/pool');
const MIGRATION_SQL = require('./db/migration');
const { startConsumer } = require('./kafka/consumer');
const { connectProducer } = require('./kafka/producer');

async function start() {
  try {
    // Run migrations
    console.log('Running database migrations...');
    await pool.query(MIGRATION_SQL);
    console.log('Database migrations completed');

    // Verify PostgreSQL connection
    const dbResult = await pool.query('SELECT NOW()');
    console.log('PostgreSQL connected:', dbResult.rows[0].now);

    // Connect Kafka producer
    try {
      await connectProducer();
    } catch (err) {
      console.warn('Kafka producer connection failed (will retry on use):', err.message);
    }

    // Start HTTP server immediately
    app.listen(config.port, () => {
      console.log(`Server running on port ${config.port}`);
      console.log(`Health check: http://localhost:${config.port}/api/health`);
    });

    // Start Kafka consumer in the background (doesn't block web server)
    startConsumer().catch(err => {
      console.warn('Kafka consumer failed to start:', err.message);
    });
  } catch (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
}

start();
