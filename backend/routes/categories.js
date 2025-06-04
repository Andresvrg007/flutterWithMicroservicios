// routes/categories.js
import { Router } from 'express';
import { 
    createCategory, 
    getCategories, 
    getCategoryById, 
    updateCategory, 
    deleteCategory, 
    getCategoryStats 
} from '../controllers/categoryController.js';

const router = Router();

// Category CRUD routes
router.post('/categories', createCategory);           // Create category
router.get('/categories', getCategories);           // Get all categories (with optional type filter)
router.get('/categories/stats', getCategoryStats);  // Get category statistics
router.get('/categories/:id', getCategoryById);     // Get category by ID
router.put('/categories/:id', updateCategory);      // Update category
router.delete('/categories/:id', deleteCategory);   // Delete category

export default router;
