// models/Transaction.js
import mongoose from 'mongoose';

// Transaction schema: stores each income or expense
// Esquema de transacción: almacena cada ingreso o gasto
const transactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',           // Reference to User / Referencia al usuario
    required: true
  },
  amount: {                // Cambiado de "monto" a "amount"
    type: Number,
    required: true
  },  category: {              // Cambiado de "categoria" a "category"
    type: String,
    required: true
  },
  categoryId: {            // Nueva referencia a Category
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: false        // Opcional para mantener compatibilidad
  },
  description: {            // Cambiado de "descripcion" a "description"
    type: String,
    trim: true
  },
  tipo: {
    type: String,
    enum: ['ingreso', 'gasto'], // Only "ingreso" or "gasto" / Solo puede ser ingreso o gasto
    required: true
  },
  fecha: {
    type: Date,
    default: Date.now        // Cambiado para que la fecha por defecto sea la fecha actual
  },
  etiquetas: [{
    type: String,
    trim: true
  }],
  metodoPago: {
    type: String,
    enum: ['efectivo', 'tarjeta', 'transferencia'],
    default: 'efectivo'
  }
}, {
  timestamps: true // Adds createdAt and updatedAt / Agrega createdAt y updatedAt
});

// Export the model / Exporta el modelo
const Transaction = mongoose.model('Transaction', transactionSchema);
export default Transaction;