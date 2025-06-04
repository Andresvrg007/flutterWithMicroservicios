import User from '../models/User.js';
import bcrypt from 'bcryptjs';

export const updatePassword = async (req, res) => {
    const { email, oldPassword, newPassword } = req.body;

    try {
        // 1. Buscar usuario por email
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ error: 'El email no existe' });
        }

        // 2. Verificar oldPassword
        const isMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ error: 'La contraseña antigua es incorrecta' });
        }

        // 3. Hashear la nueva contraseña y guardar
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);
        user.password = hashedPassword;
        await user.save();

        // 4. Responder con éxito
        res.status(200).json({ message: '¡Contraseña actualizada correctamente!' });
    } catch (error) {
        res.status(500).json({ error: 'Error del servidor' });
    }
};

// ✅ AGREGAR ESTE MÉTODO NUEVO:
export const forgotPassword = async (req, res) => {
    const { email, newPassword } = req.body;

    try {
        // Validar campos
        if (!email || !newPassword) {
            return res.status(400).json({ 
                error: 'Email y nueva contraseña son requeridos' 
            });
        }

        // Buscar usuario por email
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ 
                error: 'No existe una cuenta con este email' 
            });
        }

        // Hashear nueva contraseña (SIN verificar la antigua)
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);
        user.password = hashedPassword;
        await user.save();

        res.status(200).json({ 
            message: 'Contraseña restablecida correctamente. Ahora puedes iniciar sesión.' 
        });

    } catch (error) {
        console.error('Error en forgot password:', error);
        res.status(500).json({ error: 'Error del servidor' });
    }
};