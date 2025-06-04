import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import cookieParser from "cookie-parser";


export const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Buscar usuario por email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    // Verificar contraseña
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    // Generar token JWT
    const token = jwt.sign(
      { userId: user._id, username: user.username, auth: true },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
 // ✅ 2. Enviar como cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: false,         // true solo si usas HTTPS
      sameSite: "Strict",   // ayuda contra CSRF
      maxAge: 1000 * 60 * 60 * 24 * 7 // 7 días
    }).status(200).json({
      message: 'Login exitoso'
    });

    // Enviar respuesta exitosa con token
   

  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
}