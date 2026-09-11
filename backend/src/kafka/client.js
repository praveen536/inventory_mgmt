const { Kafka } = require('kafkajs');
const config = require('../config');

const kafka = new Kafka({
  clientId: config.kafka.clientId,
  brokers: config.kafka.brokers,
  retry: {
    initialRetryTime: 1000,
    retries: 5,
  },
});

const producer = kafka.producer();
const consumer = kafka.consumer({ groupId: config.kafka.groupId });

module.exports = { kafka, producer, consumer };
