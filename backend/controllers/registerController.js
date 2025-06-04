import User from '../models/User.js';
import bcrypt from 'bcryptjs';

export const registerUser = async (req, res) => {
    const { email, username, password } = req.body;

    try {
        // Verifica si el usuario ya existe
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: 'El email ya está registrado' });
        }

        // Hashea la contraseña
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Crea el usuario
        const newUser = new User({
            email,
            username,
            password: hashedPassword
        });
        await newUser.save();
        console.log('Usuario guardado en la base de datos:', newUser);

        res.status(201).json({ message: 'Usuario registrado correctamente' });
    } catch (error) {
        console.log('Error al guardar usuario:', error);
        res.status(500).json({ message: 'Error al registrar el usuario' });
    }
}
