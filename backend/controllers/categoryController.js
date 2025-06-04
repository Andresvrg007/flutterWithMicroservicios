// controllers/categoryController.js
import Category from '../models/Category.js';
import jwt from 'jsonwebtoken';

// Helper function to get user ID from token
const getUserIdFromToken = (req) => {
    const token = req.cookies.token || req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        throw new Error('Token not provided');
    }
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        return decoded.userId || decoded.id;
    } catch (error) {
        throw new Error('Invalid token');
    }
};

// Create a new category
// Crear una nueva categoría
export const createCategory = async (req, res) => {
    try {
        const userId = getUserIdFromToken(req);
        const { nombre, tipo, icono, color } = req.body;

        // Validate required fields
        if (!nombre || !tipo || !icono || !color) {
            return res.status(400).json({
                success: false,
                message: 'Todos los campos son requeridos (nombre, tipo, icono, color)'
            });
        }

        // Validate tipo
        if (!['ingreso', 'gasto'].includes(tipo)) {
            return res.status(400).json({
                success: false,
                message: 'El tipo debe ser "ingreso" o "gasto"'
            });
        }

        // Check if category already exists for this user
        const existingCategory = await Category.findOne({ 
            nombre: nombre.trim(), 
            userId,
            tipo 
        });

        if (existingCategory) {
            return res.status(400).json({
                success: false,
                message: 'Ya existe una categoría con este nombre y tipo'
            });
        }

        // Create new category
        const newCategory = new Category({
            nombre: nombre.trim(),
            tipo,
            icono,
            color,
            userId
        });

        const savedCategory = await newCategory.save();

        res.status(201).json({
            success: true,
            message: 'Categoría creada exitosamente',
            data: savedCategory
        });

    } catch (error) {
        console.error('Error creating category:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
};

// Get all categories for a user
// Obtener todas las categorías de un usuario
export const getCategories = async (req, res) => {
    try {
        const userId = getUserIdFromToken(req);
        const { tipo } = req.query; // Optional filter by type

        let filter = { userId };
        if (tipo && ['ingreso', 'gasto'].includes(tipo)) {
            filter.tipo = tipo;
        }

        const categories = await Category.find(filter)
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            message: 'Categorías obtenidas exitosamente',
            data: categories
        });

    } catch (error) {
        console.error('Error getting categories:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
};

// Get a single category by ID
// Obtener una categoría por ID
export const getCategoryById = async (req, res) => {
    try {
        const userId = getUserIdFromToken(req);
        const { id } = req.params;

        const category = await Category.findOne({ _id: id, userId });

        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Categoría no encontrada'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Categoría obtenida exitosamente',
            data: category
        });

    } catch (error) {
        console.error('Error getting category:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
};

// Update a category
// Actualizar una categoría
export const updateCategory = async (req, res) => {
    try {
        const userId = getUserIdFromToken(req);
        const { id } = req.params;
        const { nombre, tipo, icono, color } = req.body;

        // Find the category
        const category = await Category.findOne({ _id: id, userId });

        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Categoría no encontrada'
            });
        }

        // Validate tipo if provided
        if (tipo && !['ingreso', 'gasto'].includes(tipo)) {
            return res.status(400).json({
                success: false,
                message: 'El tipo debe ser "ingreso" o "gasto"'
            });
        }

        // Check for duplicate name if name is being changed
        if (nombre && nombre.trim() !== category.nombre) {
            const existingCategory = await Category.findOne({ 
                nombre: nombre.trim(), 
                userId,
                tipo: tipo || category.tipo,
                _id: { $ne: id }
            });

            if (existingCategory) {
                return res.status(400).json({
                    success: false,
                    message: 'Ya existe una categoría con este nombre y tipo'
                });
            }
        }

        // Update fields
        if (nombre) category.nombre = nombre.trim();
        if (tipo) category.tipo = tipo;
        if (icono) category.icono = icono;
        if (color) category.color = color;

        const updatedCategory = await category.save();

        res.status(200).json({
            success: true,
            message: 'Categoría actualizada exitosamente',
            data: updatedCategory
        });

    } catch (error) {
        console.error('Error updating category:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
};

// Delete a category
// Eliminar una categoría
export const deleteCategory = async (req, res) => {
    try {
        const userId = getUserIdFromToken(req);
        const { id } = req.params;

        const category = await Category.findOne({ _id: id, userId });

        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Categoría no encontrada'
            });
        }

        // TODO: Check if category is being used by transactions
        // In a complete implementation, you might want to:
        // 1. Prevent deletion if category has transactions
        // 2. Or reassign transactions to a default category
        // 3. Or cascade delete transactions (with user confirmation)

        await Category.findByIdAndDelete(id);

        res.status(200).json({
            success: true,
            message: 'Categoría eliminada exitosamente'
        });

    } catch (error) {
        console.error('Error deleting category:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
};

// Get category statistics
// Obtener estadísticas de categorías
export const getCategoryStats = async (req, res) => {
    try {
        const userId = getUserIdFromToken(req);

        const stats = await Category.aggregate([
            { $match: { userId: userId } },
            {
                $group: {
                    _id: '$tipo',
                    count: { $sum: 1 }
                }
            }
        ]);

        const result = {
            total: stats.reduce((acc, curr) => acc + curr.count, 0),
            ingreso: stats.find(s => s._id === 'ingreso')?.count || 0,
            gasto: stats.find(s => s._id === 'gasto')?.count || 0
        };

        res.status(200).json({
            success: true,
            message: 'Estadísticas obtenidas exitosamente',
            data: result
        });

    } catch (error) {
        console.error('Error getting category stats:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
};
