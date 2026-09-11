const db = require('../db/pool');
const inventoryRepository = require('../repositories/inventoryRepository');
const salesRepository = require('../repositories/salesRepository');
const eventRepository = require('../repositories/eventRepository');

const fifoService = {
  async processPurchase(event) {
    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      const alreadyProcessed = await eventRepository.isProcessed(client, event.event_id);
      if (alreadyProcessed) {
        await client.query('COMMIT');
        console.log(`Duplicate event skipped: ${event.event_id}`);
        return { skipped: true, reason: 'DUPLICATE_EVENT' };
      }

      await inventoryRepository.findOrCreateProduct(client, event.product_id);

      const batch = await inventoryRepository.createBatch(client, {
        productId: event.product_id,
        quantity: event.quantity,
        unitCost: event.unit_price,
        purchasedAt: event.timestamp,
      });

      await eventRepository.markProcessed(client, event.event_id, 'purchase');

      await client.query('COMMIT');
      console.log(`Purchase processed: ${event.event_id} - ${event.quantity} units of ${event.product_id} @ ${event.unit_price}`);
      return { success: true, batch };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  async processSale(event) {
    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      const alreadyProcessed = await eventRepository.isProcessed(client, event.event_id);
      if (alreadyProcessed) {
        await client.query('COMMIT');
        console.log(`Duplicate event skipped: ${event.event_id}`);
        return { skipped: true, reason: 'DUPLICATE_EVENT' };
      }

      // Lock and fetch available batches in FIFO order
      const batches = await inventoryRepository.getAvailableBatchesForUpdate(client, event.product_id);

      const totalAvailable = batches.reduce((sum, b) => sum + b.remaining_quantity, 0);
      if (totalAvailable < event.quantity) {
        await client.query('ROLLBACK');
        return {
          success: false,
          reason: 'INSUFFICIENT_INVENTORY',
          available: totalAvailable,
          requested: event.quantity,
        };
      }

      // FIFO consumption
      let remaining = event.quantity;
      let totalCost = 0;
      const allocations = [];

      for (const batch of batches) {
        if (remaining <= 0) break;

        const take = Math.min(batch.remaining_quantity, remaining);
        const cost = take * parseFloat(batch.unit_cost);

        await inventoryRepository.updateBatchQuantity(client, batch.id, batch.remaining_quantity - take);

        allocations.push({
          batchId: batch.id,
          quantity: take,
          unitCost: parseFloat(batch.unit_cost),
          totalCost: cost,
        });

        totalCost += cost;
        remaining -= take;
      }

      // Create sale record
      const sale = await salesRepository.createSale(client, {
        productId: event.product_id,
        quantity: event.quantity,
        totalCost,
        soldAt: event.timestamp,
        eventId: event.event_id,
      });

      // Create allocation records
      for (const alloc of allocations) {
        await salesRepository.createAllocation(client, {
          saleId: sale.id,
          batchId: alloc.batchId,
          quantity: alloc.quantity,
          unitCost: alloc.unitCost,
          totalCost: alloc.totalCost,
        });
      }

      await eventRepository.markProcessed(client, event.event_id, 'sale');

      await client.query('COMMIT');
      console.log(`Sale processed: ${event.event_id} - ${event.quantity} units of ${event.product_id}, FIFO cost: ${totalCost}`);
      return { success: true, sale, allocations, totalCost };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  async processEvent(event) {
    switch (event.event_type) {
      case 'purchase':
        return this.processPurchase(event);
      case 'sale':
        return this.processSale(event);
      default:
        throw new Error(`Unknown event type: ${event.event_type}`);
    }
  },
};

module.exports = fifoService;
