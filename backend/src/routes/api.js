const { Router } = require('express');
const healthController = require('../controllers/healthController');
const inventoryController = require('../controllers/inventoryController');
const ledgerController = require('../controllers/ledgerController');
const simulatorController = require('../controllers/simulatorController');
const authMiddleware = require('../middleware/auth');

const router = Router();

// Public
router.get('/health', healthController.check);

// Protected
router.get('/products', authMiddleware, inventoryController.getProducts);
router.get('/products/:productId', authMiddleware, inventoryController.getProductById);
router.get('/inventory', authMiddleware, inventoryController.getInventory);
router.get('/ledger', authMiddleware, ledgerController.getLedger);
router.get('/ledger/:productId', authMiddleware, ledgerController.getLedgerByProduct);
router.post('/simulator/events', authMiddleware, simulatorController.sendEvents);

module.exports = router;
