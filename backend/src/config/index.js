require('dotenv').config();

const config = {
  port: parseInt(process.env.PORT, 10) || 3000,

  db: {
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/inventory_db',
    max: 20,
    idleTimeoutMillis: 30000,
  },

  kafka: {
    brokers: (process.env.KAFKA_BROKERS || 'localhost:19092').split(','),
    clientId: process.env.KAFKA_CLIENT_ID || 'inventory-service',
    groupId: process.env.KAFKA_GROUP_ID || 'inventory-consumer-group',
    topic: process.env.KAFKA_TOPIC || 'inventory-events',
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
    expiresIn: '24h',
  },

  admin: {
    username: process.env.ADMIN_USERNAME || 'admin',
    passwordHash: process.env.ADMIN_PASSWORD_HASH || '',
  },

  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:4200',
};

module.exports = config;
