const salesRepository = require('../repositories/salesRepository');

const ledgerController = {
  async getLedger(req, res, next) {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
      const result = await salesRepository.getLedger({ page, limit });
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },

  async getLedgerByProduct(req, res, next) {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
      const result = await salesRepository.getLedger({
        productId: req.params.productId,
        page,
        limit,
      });
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = ledgerController;
