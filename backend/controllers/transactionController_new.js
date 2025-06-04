// controllers/transactionController.js
import Transaction from '../models/Transaction.js';
import Category from '../models/Category.js';
import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

// Helper function to get user ID from token
const getUserIdFromToken = (req) => {
    const token = req.cookies.token || req.headers.authorization?.split(' ')[1];
    if (!token) {
        throw new Error('Token not provided');
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded.userId || decoded.id;
};

// Create a new transaction
export const addTransaction = async (req, res) => {
    try {
        const userId = getUserIdFromToken(req);
        const { amount, description, category, categoryId, type, metodoPago } = req.body;
        
        // Validate required fields
        if (!amount || !description || !type) {
            return res.status(400).json({ 
                success: false,
                message: 'Amount, description, and type are required' 
            });
        }
        
        if (isNaN(amount) || Number(amount) <= 0) {
            return res.status(400).json({ 
                success: false,
                message: 'Amount must be a positive number' 
            });
        }
        
        if (!['income', 'expense'].includes(type)) {
            return res.status(400).json({ 
                success: false,
                message: 'Invalid transaction type. Use "income" or "expense"' 
            });
        }

        // Map type to DB values
        const dbType = type === 'income' ? 'ingreso' : 'gasto';
        
        // Validate category if categoryId is provided
        let categoryName = category;
        if (categoryId) {
            const categoryDoc = await Category.findOne({ _id: categoryId, userId });
            if (!categoryDoc) {
                return res.status(400).json({ 
                    success: false,
                    message: 'Category not found' 
                });
            }
            categoryName = categoryDoc.nombre;
        }

        // Create transaction
        const transaction = new Transaction({
            userId,
            tipo: dbType,
            category: categoryName || category,
            categoryId: categoryId || null,
            amount: Number(amount),
            fecha: new Date(),
            description: description,
            metodoPago: metodoPago || 'efectivo'
        });
        
        await transaction.save();

        // Update user balance
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ 
                success: false,
                message: 'User not found' 
            });
        }
        
        if (type === 'income') {
            user.balance += Number(amount);
        } else {
            user.balance -= Number(amount);
        }
        await user.save();

        res.status(201).json({ 
            success: true,
            message: 'Transaction added successfully',
            data: transaction
        });
    } catch (error) {
        console.error('Error adding transaction:', error);
        res.status(500).json({ 
            success: false,
            message: 'Error adding transaction' 
        });
    }
};

// Get all transactions for a user
export const getTransactions = async (req, res) => {
    try {
        const userId = getUserIdFromToken(req);
        const { type, startDate, endDate, page = 1, limit = 50 } = req.query;

        // Build filter
        let filter = { userId: new mongoose.Types.ObjectId(userId) };
        
        if (type && ['ingreso', 'gasto'].includes(type)) {
            filter.tipo = type;
        }
        
        if (startDate || endDate) {
            filter.fecha = {};
            if (startDate) filter.fecha.$gte = new Date(startDate);
            if (endDate) filter.fecha.$lte = new Date(endDate);
        }

        // Calculate pagination
        const skip = (page - 1) * limit;

        // Get transactions with pagination
        const transactions = await Transaction.find(filter)
            .populate('categoryId', 'nombre tipo icono color')
            .sort({ fecha: -1 })
            .skip(skip)
            .limit(Number(limit));

        // Get total count
        const total = await Transaction.countDocuments(filter);

        res.status(200).json({
            success: true,
            message: 'Transactions retrieved successfully',
            data: {
                transactions,
                pagination: {
                    current: Number(page),
                    total: Math.ceil(total / limit),
                    count: transactions.length,
                    totalRecords: total
                }
            }
        });

    } catch (error) {
        console.error('Error getting transactions:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving transactions'
        });
    }
};

// Get transaction by ID
export const getTransactionById = async (req, res) => {
    try {
        const userId = getUserIdFromToken(req);
        const { id } = req.params;

        const transaction = await Transaction.findOne({ 
            _id: id, 
            userId: new mongoose.Types.ObjectId(userId) 
        }).populate('categoryId', 'nombre tipo icono color');

        if (!transaction) {
            return res.status(404).json({
                success: false,
                message: 'Transaction not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Transaction retrieved successfully',
            data: transaction
        });

    } catch (error) {
        console.error('Error getting transaction:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving transaction'
        });
    }
};

// Update a transaction
export const updateTransaction = async (req, res) => {
    try {
        const userId = getUserIdFromToken(req);
        const { id } = req.params;
        const { amount, description, category, categoryId, type, metodoPago } = req.body;

        // Find the original transaction
        const originalTransaction = await Transaction.findOne({ 
            _id: id, 
            userId: new mongoose.Types.ObjectId(userId) 
        });
        
        if (!originalTransaction) {
            return res.status(404).json({ 
                success: false,
                message: 'Transaction not found' 
            });
        }

        // Validate new data if provided
        if (amount && (isNaN(amount) || Number(amount) <= 0)) {
            return res.status(400).json({ 
                success: false,
                message: 'Amount must be a positive number' 
            });
        }
        
        if (type && !['income', 'expense'].includes(type)) {
            return res.status(400).json({ 
                success: false,
                message: 'Invalid transaction type' 
            });
        }

        // Update user balance (revert original, apply new)
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ 
                success: false,
                message: 'User not found' 
            });
        }

        // Revert original transaction effect
        if (originalTransaction.tipo === 'ingreso') {
            user.balance -= originalTransaction.amount;
        } else {
            user.balance += originalTransaction.amount;
        }

        // Prepare update data
        const updateData = {};
        if (amount) updateData.amount = Number(amount);
        if (description) updateData.description = description;
        if (category) updateData.category = category;
        if (categoryId) updateData.categoryId = categoryId;
        if (metodoPago) updateData.metodoPago = metodoPago;
        
        if (type) {
            updateData.tipo = type === 'income' ? 'ingreso' : 'gasto';
        }

        // Validate category if categoryId is provided
        if (categoryId) {
            const categoryDoc = await Category.findOne({ _id: categoryId, userId });
            if (!categoryDoc) {
                return res.status(400).json({ 
                    success: false,
                    message: 'Category not found' 
                });
            }
            updateData.category = categoryDoc.nombre;
        }

        // Apply new transaction effect
        const newAmount = updateData.amount || originalTransaction.amount;
        const newType = updateData.tipo || originalTransaction.tipo;
        
        if (newType === 'ingreso') {
            user.balance += newAmount;
        } else {
            user.balance -= newAmount;
        }

        // Update transaction and user
        const updatedTransaction = await Transaction.findByIdAndUpdate(
            id, 
            updateData, 
            { new: true }
        ).populate('categoryId', 'nombre tipo icono color');
        
        await user.save();

        res.status(200).json({ 
            success: true,
            message: 'Transaction updated successfully',
            data: updatedTransaction
        });

    } catch (error) {
        console.error('Error updating transaction:', error);
        res.status(500).json({ 
            success: false,
            message: 'Error updating transaction' 
        });
    }
};

// Delete a transaction
export const deleteTransaction = async (req, res) => {
    try {
        const userId = getUserIdFromToken(req);
        const { id } = req.params;

        const transaction = await Transaction.findOne({ 
            _id: id, 
            userId: new mongoose.Types.ObjectId(userId) 
        });
        
        if (!transaction) {
            return res.status(404).json({ 
                success: false,
                message: 'Transaction not found' 
            });
        }

        // Update user balance (revert transaction effect)
        const user = await User.findById(userId);
        if (user) {
            if (transaction.tipo === 'ingreso') {
                user.balance -= transaction.amount;
            } else {
                user.balance += transaction.amount;
            }
            await user.save();
        }

        await Transaction.findByIdAndDelete(id);

        res.status(200).json({ 
            success: true,
            message: 'Transaction deleted successfully' 
        });

    } catch (error) {
        console.error('Error deleting transaction:', error);
        res.status(500).json({ 
            success: false,
            message: 'Error deleting transaction' 
        });
    }
};

// Get transaction summary/statistics
export const getTransactionsSummary = async (req, res) => {
    try {
        const userId = getUserIdFromToken(req);
        const { startDate, endDate } = req.query;

        // Build date filter
        let dateFilter = {};
        if (startDate || endDate) {
            dateFilter.fecha = {};
            if (startDate) dateFilter.fecha.$gte = new Date(startDate);
            if (endDate) dateFilter.fecha.$lte = new Date(endDate);
        }

        const summary = await Transaction.aggregate([
            { 
                $match: { 
                    userId: new mongoose.Types.ObjectId(userId),
                    ...dateFilter
                } 
            },
            {
                $group: {
                    _id: { type: "$tipo", category: "$category" },
                    total: { $sum: "$amount" },
                    count: { $sum: 1 }
                }
            },
            {
                $project: {
                    type: "$_id.type",
                    category: "$_id.category",
                    total: 1,
                    count: 1,
                    _id: 0
                }
            }
        ]);

        const income = summary.filter(item => item.type === "ingreso");
        const expenses = summary.filter(item => item.type === "gasto");
        
        const totalIncome = income.reduce((sum, item) => sum + item.total, 0);
        const totalExpenses = expenses.reduce((sum, item) => sum + item.total, 0);
        const balance = totalIncome - totalExpenses;

        res.status(200).json({ 
            success: true,
            message: 'Summary retrieved successfully',
            data: {
                income,
                expenses,
                totals: {
                    income: totalIncome,
                    expenses: totalExpenses,
                    balance: balance
                }
            }
        });

    } catch (error) {
        console.error('Error getting transactions summary:', error);
        res.status(500).json({ 
            success: false,
            message: 'Error retrieving summary' 
        });
    }
};

// Reset monthly transactions (utility function)
export const resetMonthlyTransactions = async (req, res) => {
    try {
        const userId = getUserIdFromToken(req);
        
        // Get current month start and end
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        const result = await Transaction.deleteMany({
            userId: new mongoose.Types.ObjectId(userId),
            fecha: {
                $gte: monthStart,
                $lte: monthEnd
            }
        });

        // Reset user balance to 0 or salary
        const user = await User.findById(userId);
        if (user) {
            user.balance = user.salary || 0;
            await user.save();
        }

        res.status(200).json({ 
            success: true,
            message: `Monthly transactions reset successfully. ${result.deletedCount} transactions deleted.`
        });

    } catch (error) {
        console.error('Error resetting monthly transactions:', error);
        res.status(500).json({ 
            success: false,
            message: 'Error resetting monthly transactions' 
        });
    }
};
