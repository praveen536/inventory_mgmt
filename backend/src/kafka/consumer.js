const { consumer } = require('./client');
const config = require('../config');
const { validateEvent } = require('../validators/eventValidator');
const fifoService = require('../services/fifoService');

async function startConsumer() {
  await consumer.connect();
  console.log('Kafka consumer connected');

  await consumer.subscribe({
    topic: config.kafka.topic,
    fromBeginning: true,
  });

  await consumer.run({
    autoCommit: false,
    eachMessage: async ({ topic, partition, message, heartbeat }) => {
      const raw = message.value.toString();
      let event;

      try {
        event = JSON.parse(raw);
      } catch (err) {
        console.warn('Invalid JSON in Kafka message, skipping:', raw);
        await consumer.commitOffsets([
          { topic, partition, offset: (BigInt(message.offset) + 1n).toString() },
        ]);
        return;
      }

      const errors = validateEvent(event);
      if (errors.length > 0) {
        console.warn(`Invalid event ${event.event_id || 'unknown'}:`, errors);
        await consumer.commitOffsets([
          { topic, partition, offset: (BigInt(message.offset) + 1n).toString() },
        ]);
        return;
      }

      try {
        const result = await fifoService.processEvent(event);

        if (result.reason === 'INSUFFICIENT_INVENTORY') {
          console.warn(
            `Insufficient inventory for ${event.product_id}: ` +
            `available=${result.available}, requested=${result.requested}`
          );
        }

        await consumer.commitOffsets([
          { topic, partition, offset: (BigInt(message.offset) + 1n).toString() },
        ]);
      } catch (err) {
        console.error(`Error processing event ${event.event_id}:`, err.message);
        // Do NOT commit offset — message will be redelivered
        throw err;
      }
    },
  });

  console.log(`Kafka consumer listening on topic: ${config.kafka.topic}`);
}

async function stopConsumer() {
  await consumer.disconnect();
}

module.exports = { startConsumer, stopConsumer };
