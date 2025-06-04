// models/Budget.js
import mongoose from 'mongoose';

// Budget schema: stores user budgets for categories and periods
// Esquema de presupuesto: almacena presupuestos del usuario por categoría y periodo
const budgetSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Reference to User / Referencia al usuario
    required: true
  },
  categoriaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category', // Reference to Category / Referencia a la categoría
    required: true
  },
  monto: {
    type: Number,
    required: true
  },
  periodo: {
    type: String,
    enum: ['mensual', 'anual'], // Only "mensual" or "anual" / Solo puede ser mensual o anual
    default: 'mensual'
  },
  mes: {
    type: Number,
    required: true,
    min: 1,
    max: 12
  },
  año: {
    type: Number,
    required: true
  }
}, {
  timestamps: true // Adds createdAt and updatedAt / Agrega createdAt y updatedAt
});

// Export the model / Exporta el modelo
const Budget = mongoose.model('Budget', budgetSchema);
export default Budget;