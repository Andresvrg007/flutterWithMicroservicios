import express from 'express';
import { 
    addTransaction, 
    getTransactions, 
    updateTransaction, 
    deleteTransaction, 
    getTransactionById,
    getTransactionsSummary 
} from '../controllers/transactionController_new.js';

const router = express.Router();

// POST /api/transactions - Create new transaction
router.post('/', addTransaction);

// GET /api/transactions - Get all transactions for user
router.get('/', getTransactions);

// GET /api/transactions/:id - Get transaction by ID
router.get('/:id', getTransactionById);

// PUT /api/transactions/:id - Update transaction
router.put('/:id', updateTransaction);

// DELETE /api/transactions/:id - Delete transaction
router.delete('/:id', deleteTransaction);

// GET /api/transactions-summary - Get transactions summary
router.get('-summary', getTransactionsSummary);

export default router;
