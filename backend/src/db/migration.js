const MIGRATION_SQL = `
-- Idempotency table for Kafka events
CREATE TABLE IF NOT EXISTS processed_events (
  id SERIAL PRIMARY KEY,
  event_id VARCHAR(255) UNIQUE NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  processed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Products
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  product_id VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inventory batches (FIFO source)
CREATE TABLE IF NOT EXISTS inventory_batches (
  id SERIAL PRIMARY KEY,
  product_id VARCHAR(100) NOT NULL REFERENCES products(product_id),
  original_quantity INTEGER NOT NULL CHECK (original_quantity > 0),
  remaining_quantity INTEGER NOT NULL CHECK (remaining_quantity >= 0),
  unit_cost NUMERIC(15, 4) NOT NULL CHECK (unit_cost >= 0),
  purchased_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT chk_remaining_lte_original CHECK (remaining_quantity <= original_quantity)
);

-- Sales
CREATE TABLE IF NOT EXISTS sales (
  id SERIAL PRIMARY KEY,
  product_id VARCHAR(100) NOT NULL REFERENCES products(product_id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  total_cost NUMERIC(15, 4) NOT NULL CHECK (total_cost >= 0),
  sold_at TIMESTAMPTZ NOT NULL,
  event_id VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sale-to-batch allocation (audit trail)
CREATE TABLE IF NOT EXISTS sale_batch_allocations (
  id SERIAL PRIMARY KEY,
  sale_id INTEGER NOT NULL REFERENCES sales(id),
  inventory_batch_id INTEGER NOT NULL REFERENCES inventory_batches(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_cost NUMERIC(15, 4) NOT NULL CHECK (unit_cost >= 0),
  total_cost NUMERIC(15, 4) NOT NULL CHECK (total_cost >= 0)
);

-- FIFO batch lookup: partial index on batches with remaining stock
CREATE INDEX IF NOT EXISTS idx_batches_fifo
ON inventory_batches (product_id, purchased_at, id)
WHERE remaining_quantity > 0;

-- Sales by product for ledger queries
CREATE INDEX IF NOT EXISTS idx_sales_product_id
ON sales (product_id, sold_at DESC);

-- Allocations by sale for detail views
CREATE INDEX IF NOT EXISTS idx_allocations_sale_id
ON sale_batch_allocations (sale_id);
`;

module.exports = MIGRATION_SQL;
