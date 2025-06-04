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

// Función para agregar una nueva transacción / Function to add a new transaction
export const addTransaction = async (req, res) => {
    try {
        const userId = getUserIdFromToken(req);
        const { amount, description, category, categoryId, type, metodoPago } = req.body;
        
        if (!amount || !description || !type) {
            return res.status(400).json({ 
                success: false,
                error: 'Amount, description, and type are required' 
            });
        }
        
        if (isNaN(amount) || Number(amount) <= 0) {
            return res.status(400).json({ 
                success: false,
                error: 'Amount must be a positive number' 
            });
        }
        
        if (!['income', 'expense'].includes(type)) {
            return res.status(400).json({ 
                success: false,
                error: 'Invalid transaction type' 
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
                    error: 'Category not found' 
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
                error: 'User not found' 
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
            error: 'Error adding transaction' 
        });
    }
};

// Función para obtener resumen de transacciones
export const getTransactionsSummary = async (req, res) => {
    try {
        const userId = getUserIdFromToken(req);

        // Verificar y resetear automáticamente si es necesario
        await checkAndResetIfEndOfMonth(userId);

        const summary = await Transaction.aggregate([
            { $match: { userId: new mongoose.Types.ObjectId(userId) } },
            {
                $group: {
                    _id: { type: "$tipo", category: "$category" },
                    total: { $sum: "$amount" }
                }
            },
            {
                $project: {
                    type: "$_id.type",
                    category: "$_id.category",
                    total: 1,
                    _id: 0
                }
            }
        ]);

        const income = summary.filter(item => item.type === "ingreso");
        const expenses = summary.filter(item => item.type === "gasto");

        res.json({ income, expenses });
    } catch (error) {        console.error('Error getting transactions summary:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// Función para obtener todas las transacciones del usuario
export const getTransactions = async (req, res) => {
    try {
        const token = req.cookies.token;
        if (!token) {
            return res.status(401).json({ error: 'Not authenticated' });
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.userId;

        const transactions = await Transaction.find({ userId: new mongoose.Types.ObjectId(userId) })
            .sort({ fecha: -1 }); // Ordenar por fecha descendente

        // Mapear los datos al formato esperado por Flutter
        const formattedTransactions = transactions.map(transaction => ({
            id: transaction._id,
            amount: transaction.amount,
            description: transaction.description,
            category: transaction.category,
            type: transaction.tipo === 'ingreso' ? 'income' : 'expense',
            date: transaction.fecha.toISOString()
        }));

        res.json({ transactions: formattedTransactions });
    } catch (error) {
        console.error('Error getting transactions:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// Función para actualizar una transacción
export const updateTransaction = async (req, res) => {
    try {
        const token = req.cookies.token;
        if (!token) {
            return res.status(401).json({ error: 'Not authenticated' });
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.userId;

        const { id } = req.params;
        const { amount, description, category, type } = req.body;

        if (!amount || !description || !category || !type) {
            return res.status(400).json({ error: 'All fields are required' });
        }
        if (isNaN(amount) || Number(amount) <= 0) {
            return res.status(400).json({ error: 'Amount must be a positive number' });
        }
        if (!['income', 'expense'].includes(type)) {
            return res.status(400).json({ error: 'Invalid transaction type' });
        }

        // Buscar la transacción original
        const originalTransaction = await Transaction.findOne({ 
            _id: id, 
            userId: new mongoose.Types.ObjectId(userId) 
        });
        
        if (!originalTransaction) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        // Revertir el efecto de la transacción original en el balance
        const user = await User.findById(userId);
        if (originalTransaction.tipo === 'ingreso') {
            user.balance -= originalTransaction.amount;
        } else {
            user.balance += originalTransaction.amount;
        }

        // Aplicar el nuevo valor
        const dbType = type === 'income' ? 'ingreso' : 'gasto';
        if (type === 'income') {
            user.balance += Number(amount);
        } else {
            user.balance -= Number(amount);
        }

        // Actualizar la transacción
        await Transaction.findByIdAndUpdate(id, {
            tipo: dbType,
            category: category,
            amount: Number(amount),
            description: description
        });

        await user.save();

        res.json({ message: 'Transaction updated successfully' });
    } catch (error) {
        console.error('Error updating transaction:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// Función para eliminar una transacción
export const deleteTransaction = async (req, res) => {
    try {
        const token = req.cookies.token;
        if (!token) {
            return res.status(401).json({ error: 'Not authenticated' });
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.userId;

        const { id } = req.params;

        // Buscar la transacción
        const transaction = await Transaction.findOne({ 
            _id: id, 
            userId: new mongoose.Types.ObjectId(userId) 
        });
        
        if (!transaction) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        // Revertir el efecto en el balance del usuario
        const user = await User.findById(userId);
        if (transaction.tipo === 'ingreso') {
            user.balance -= transaction.amount;
        } else {
            user.balance += transaction.amount;
        }

        // Eliminar la transacción
        await Transaction.findByIdAndDelete(id);
        await user.save();

        res.json({ message: 'Transaction deleted successfully' });
    } catch (error) {
        console.error('Error deleting transaction:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// Función para resetear transacciones al final del mes
export const resetMonthlyTransactions = async (req, res) => {
    try {
        const token = req.cookies.token;
        if (!token) {
            return res.status(401).json({ error: 'Not authenticated' });
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.userId;

        // Eliminar todas las transacciones del usuario
        await Transaction.deleteMany({ userId: new mongoose.Types.ObjectId(userId) });

        // Resetear el balance del usuario a 0
        await User.findByIdAndUpdate(userId, { balance: 0 });

        res.json({ message: 'Monthly transactions reset successfully' });
    } catch (error) {
        console.error('Error resetting monthly transactions:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// Función para verificar y resetear automáticamente si es fin de mes
export const checkAndResetIfEndOfMonth = async (userId) => {
    try {
        const now = new Date();
        const lastResetKey = `lastReset_${userId}`;
        
        // Verificar si ya se reseteó este mes
        const user = await User.findById(userId);
        if (!user.lastMonthlyReset) {
            user.lastMonthlyReset = new Date(now.getFullYear(), now.getMonth(), 1);
            await user.save();
        }

        const lastReset = new Date(user.lastMonthlyReset);
        const currentMonth = now.getMonth();
        const lastResetMonth = lastReset.getMonth();

        // Si estamos en un mes diferente al último reset, resetear
        if (currentMonth !== lastResetMonth) {
            await Transaction.deleteMany({ userId: new mongoose.Types.ObjectId(userId) });
            
            // Actualizar la fecha del último reset
            user.lastMonthlyReset = new Date(now.getFullYear(), now.getMonth(), 1);
            user.balance = 0;
            await user.save();
            
            console.log(`Monthly reset performed for user ${userId}`);
            return true;
        }
        
        return false;
    } catch (error) {
        console.error('Error in automatic monthly reset:', error);
        return false;
    }
};