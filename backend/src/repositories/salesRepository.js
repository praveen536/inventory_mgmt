const db = require('../db/pool');

const salesRepository = {
  async createSale(client, { productId, quantity, totalCost, soldAt, eventId }) {
    const result = await client.query(
      `INSERT INTO sales (product_id, quantity, total_cost, sold_at, event_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [productId, quantity, totalCost, soldAt, eventId]
    );
    return result.rows[0];
  },

  async createAllocation(client, { saleId, batchId, quantity, unitCost, totalCost }) {
    await client.query(
      `INSERT INTO sale_batch_allocations (sale_id, inventory_batch_id, quantity, unit_cost, total_cost)
       VALUES ($1, $2, $3, $4, $5)`,
      [saleId, batchId, quantity, unitCost, totalCost]
    );
  },

  async getLedger({ productId, page = 1, limit = 20 } = {}) {
    const offset = (page - 1) * limit;

    let whereClause = '';
    const params = [];

    if (productId) {
      whereClause = 'WHERE ledger.product_id = $1';
      params.push(productId);
    }

    const countQuery = `
      SELECT COUNT(*) AS total FROM (
        SELECT id FROM inventory_batches ${productId ? 'WHERE product_id = $1' : ''}
        UNION ALL
        SELECT id FROM sales ${productId ? 'WHERE product_id = $1' : ''}
      ) AS ledger
    `;
    const countResult = await db.query(countQuery, productId ? [productId, productId] : []);
    const total = parseInt(countResult.rows[0].total, 10);

    const dataQuery = `
      SELECT
        'purchase' AS event_type,
        product_id,
        original_quantity AS quantity,
        (original_quantity * unit_cost) AS total_cost,
        unit_cost,
        purchased_at AS timestamp,
        NULL AS event_id,
        'completed' AS status
      FROM inventory_batches
      ${productId ? 'WHERE product_id = $1' : ''}

      UNION ALL

      SELECT
        'sale' AS event_type,
        product_id,
        quantity,
        total_cost,
        NULL AS unit_cost,
        sold_at AS timestamp,
        event_id,
        'completed' AS status
      FROM sales
      ${productId ? 'WHERE product_id = $1' : ''}

      ORDER BY timestamp DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    params.push(limit, offset);
    const dataResult = await db.query(dataQuery, params);

    return {
      entries: dataResult.rows,
      total,
      page,
      limit,
    };
  },
};

module.exports = salesRepository;
