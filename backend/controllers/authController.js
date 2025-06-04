import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import User from '../models/User.js'; // Asegúrate de que la ruta sea correcta

export const verifyAuth = async (req, res) => {
    try {
        // El token viene en las cookies
        const token = req.cookies.token;
        
        if (!token) {
            return res.status(401).json({ 
                isAuthenticated: false,
                message: 'No hay token de autenticación' 
            });
        }

        // Verificar el token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Si el token es válido, devolver la información del usuario
        res.status(200).json({
            isAuthenticated: true,
            user: {
                userId: decoded.userId,
                username: decoded.username
            }
        });

    } catch (error) {
        console.error('Error en verificación de auth:', error);
        res.status(401).json({ 
            isAuthenticated: false,
            message: 'Token inválido o expirado' 
        });
    }
};

export const logout = (req, res) => {
    try {
        // Limpiar la cookie estableciendo una fecha de expiración en el pasado
        res.clearCookie('token', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'Strict'
        });
        
        res.status(200).json({ message: 'Logout exitoso' });
    } catch (error) {
        console.error('Error en logout:', error);
        res.status(500).json({ message: 'Error al cerrar sesión' });
    }
};

export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Buscar usuario por email
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Email o contraseña incorrectos'
            });
        }

        // Verificar contraseña
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({
                success: false,
                message: 'Email o contraseña incorrectos'
            });
        }

        // Generar token JWT
        const token = jwt.sign(
            { userId: user._id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Devolver el token en la respuesta
        res.json({
            success: true,
            message: 'Login exitoso',
            token: token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email
            }
        });

    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
};