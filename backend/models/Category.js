// models/Category.js
import mongoose from 'mongoose';

// Category schema: stores categories for transactions
// Esquema de categoría: almacena categorías para las transacciones
const categorySchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: true,
    trim: true
  },
  tipo: {
    type: String,
    enum: ['ingreso', 'gasto'], // Only "ingreso" or "gasto" / Solo puede ser ingreso o gasto
    required: true
  },
  icono: {
    type: String,
    required: true
  },
  color: {
    type: String,
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Reference to User for custom categories / Referencia al usuario para categorías personalizadas
    required: true
  }
}, {
  timestamps: true // Adds createdAt and updatedAt / Agrega createdAt y updatedAt
});

// Export the model / Exporta el modelo
const Category = mongoose.model('Category', categorySchema);
export default Category;