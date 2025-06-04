import User from '../models/User.js';
import jwt from 'jsonwebtoken';

// Función para obtener el perfil del usuario / Function to get user profile
export const getProfile = async (req, res) => {
  try {
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.status(200).json({ salary: user.salario.monto });
  } catch (error) {
    res.status(500).json({ error: 'Error fetching user profile' });
  }
};

// Función para actualizar el perfil del usuario / Function to update user profile
export const updateProfile = async (req, res) => {
  // (Aquí irá la lógica para actualizar el perfil)
};

// Función para guardar el sueldo del usuario
export const saveSalary = async (req, res) => {
  try {
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ error: 'No autenticado' });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;
    const { sueldo } = req.body;
    if (!sueldo || Number(sueldo) <= 0) {
      return res.status(400).json({ error: 'Sueldo inválido' });
    }
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    const previousSalary = user.salario.monto;
    user.salario.monto = Number(sueldo);
    user.salario.fechaActualizacion = new Date();
    // Si el sueldo anterior era 0, inicializa el balance con el sueldo
    if (!previousSalary || previousSalary === 0) {
      user.balance = Number(sueldo);
    }
    await user.save();
    res.status(200).json({ message: '¡Sueldo guardado exitosamente!' });
  } catch (error) {
    res.status(500).json({ error: 'Error al guardar el sueldo' });
  }
};