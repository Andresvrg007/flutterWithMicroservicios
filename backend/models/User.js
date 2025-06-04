// models/User.js
import mongoose from 'mongoose';

// User schema: stores user info and salary
// Esquema de usuario: almacena información del usuario y salario
const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,      // Required / Obligatorio
    unique: true,        // No duplicates / No duplicados
    trim: true,          // Remove spaces / Elimina espacios
    lowercase: true      // Save in lowercase / Guarda en minúsculas
  },
  password: {
    type: String,
    required: true       // Required / Obligatorio
  },
  username: {
    type: String,
    required: true,      // Required / Obligatorio
    trim: true
  },
  salario: {
    monto: {
      type: Number,
      default: 0
    },
    moneda: {
      type: String,
      default: 'DO'
    },
    fechaActualizacion: {
      type: Date,
      default: Date.now
    }  },
  balance: {
    type: Number,
    default: 0
  },
  lastMonthlyReset: {
    type: Date,
    default: null
  }
}, {
  timestamps: true // Adds createdAt and updatedAt / Agrega createdAt y updatedAt
});

// Export the model / Exporta el modelo
const User = mongoose.model('User', userSchema);
export default User;