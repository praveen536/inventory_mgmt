const db = require('../db/pool');

const eventRepository = {
  async isProcessed(client, eventId) {
    const result = await client.query(
      `SELECT id FROM processed_events WHERE event_id = $1`,
      [eventId]
    );
    return result.rows.length > 0;
  },

  async markProcessed(client, eventId, eventType) {
    await client.query(
      `INSERT INTO processed_events (event_id, event_type)
       VALUES ($1, $2)
       ON CONFLICT (event_id) DO NOTHING`,
      [eventId, eventType]
    );
  },
};

module.exports = eventRepository;
