const db = require('../db/pool');

const healthController = {
  async check(req, res) {
    const status = { api: 'ok', postgres: 'unknown', kafka: 'unknown' };

    try {
      await db.query('SELECT 1');
      status.postgres = 'ok';
    } catch (err) {
      status.postgres = 'error';
    }

    // Kafka health is inferred from consumer connection state
    // A detailed check would require admin API calls which are expensive
    try {
      const { kafka } = require('../kafka/client');
      const admin = kafka.admin();
      await admin.connect();
      await admin.listTopics();
      await admin.disconnect();
      status.kafka = 'ok';
    } catch (err) {
      status.kafka = 'error';
    }

    const allHealthy = status.postgres === 'ok' && status.kafka === 'ok';
    res.status(allHealthy ? 200 : 503).json({
      success: true,
      data: status,
    });
  },
};

module.exports = healthController;
