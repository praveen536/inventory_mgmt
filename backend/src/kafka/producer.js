const { producer } = require('./client');
const config = require('../config');

let connected = false;

async function connectProducer() {
  if (connected) return;
  await producer.connect();
  connected = true;
  console.log('Kafka producer connected');
}

async function sendEvent(event) {
  await connectProducer();
  await producer.send({
    topic: config.kafka.topic,
    messages: [
      {
        key: event.product_id,
        value: JSON.stringify(event),
      },
    ],
  });
}

async function sendEvents(events) {
  await connectProducer();
  const messages = events.map((event) => ({
    key: event.product_id,
    value: JSON.stringify(event),
  }));
  await producer.send({
    topic: config.kafka.topic,
    messages,
  });
}

async function disconnectProducer() {
  if (!connected) return;
  await producer.disconnect();
  connected = false;
}

module.exports = { connectProducer, sendEvent, sendEvents, disconnectProducer };
