const db = require('../db/pool');

const inventoryRepository = {
  async findOrCreateProduct(client, productId) {
    const result = await client.query(
      `INSERT INTO products (product_id, name)
       VALUES ($1, $2)
       ON CONFLICT (product_id) DO UPDATE SET product_id = EXCLUDED.product_id
       RETURNING id, product_id, name`,
      [productId, productId]
    );
    return result.rows[0];
  },

  async createBatch(client, { productId, quantity, unitCost, purchasedAt }) {
    const result = await client.query(
      `INSERT INTO inventory_batches (product_id, original_quantity, remaining_quantity, unit_cost, purchased_at)
       VALUES ($1, $2, $2, $3, $4)
       RETURNING *`,
      [productId, quantity, unitCost, purchasedAt]
    );
    return result.rows[0];
  },

  async getAvailableBatchesForUpdate(client, productId) {
    const result = await client.query(
      `SELECT id, remaining_quantity, unit_cost
       FROM inventory_batches
       WHERE product_id = $1 AND remaining_quantity > 0
       ORDER BY purchased_at ASC, id ASC
       FOR UPDATE`,
      [productId]
    );
    return result.rows;
  },

  async updateBatchQuantity(client, batchId, newRemaining) {
    await client.query(
      `UPDATE inventory_batches SET remaining_quantity = $1 WHERE id = $2`,
      [newRemaining, batchId]
    );
  },

  async getInventorySummary() {
    const result = await db.query(
      `SELECT
         p.product_id,
         p.name,
         COALESCE(SUM(ib.remaining_quantity), 0)::int AS current_quantity,
         COALESCE(SUM(ib.remaining_quantity * ib.unit_cost), 0)::numeric AS total_cost
       FROM products p
       LEFT JOIN inventory_batches ib ON p.product_id = ib.product_id AND ib.remaining_quantity > 0
       GROUP BY p.product_id, p.name
       ORDER BY p.product_id`
    );
    return result.rows;
  },

  async getProductInventory(productId) {
    const result = await db.query(
      `SELECT
         p.product_id,
         p.name,
         COALESCE(SUM(ib.remaining_quantity), 0)::int AS current_quantity,
         COALESCE(SUM(ib.remaining_quantity * ib.unit_cost), 0)::numeric AS total_cost
       FROM products p
       LEFT JOIN inventory_batches ib ON p.product_id = ib.product_id AND ib.remaining_quantity > 0
       WHERE p.product_id = $1
       GROUP BY p.product_id, p.name`,
      [productId]
    );
    return result.rows[0] || null;
  },

  async getAllProducts() {
    const result = await db.query(
      `SELECT id, product_id, name, created_at FROM products ORDER BY product_id`
    );
    return result.rows;
  },

  async getProductByProductId(productId) {
    const result = await db.query(
      `SELECT id, product_id, name, created_at FROM products WHERE product_id = $1`,
      [productId]
    );
    return result.rows[0] || null;
  },
};

module.exports = inventoryRepository;
