const inventoryRepository = require('../repositories/inventoryRepository');

const inventoryController = {
  async getProducts(req, res, next) {
    try {
      const products = await inventoryRepository.getAllProducts();
      res.json({ success: true, data: products });
    } catch (err) {
      next(err);
    }
  },

  async getProductById(req, res, next) {
    try {
      const product = await inventoryRepository.getProductByProductId(req.params.productId);
      if (!product) {
        return res.status(404).json({
          success: false,
          error: { code: 'PRODUCT_NOT_FOUND', message: `Product ${req.params.productId} not found` },
        });
      }
      res.json({ success: true, data: product });
    } catch (err) {
      next(err);
    }
  },

  async getInventory(req, res, next) {
    try {
      const inventory = await inventoryRepository.getInventorySummary();
      res.json({ success: true, data: inventory });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = inventoryController;
