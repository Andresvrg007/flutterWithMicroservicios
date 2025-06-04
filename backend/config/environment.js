// Environment configuration for different deployment scenarios
export const config = {
    development: {
        port: 5000,
        mongodbUri: 'mongodb://127.0.0.1:27017/expensesApp',
        frontendUrl: 'http://localhost:5173',
        jwtSecret: 'development_jwt_secret',
        cookieOptions: {
            httpOnly: true,
            secure: false,
            sameSite: 'Strict',
            maxAge: 1000 * 60 * 60 * 24 * 7 // 7 days
        }
    },
    production: {
        port: process.env.PORT || 5000,
        mongodbUri: process.env.MONGODB_URI,
        frontendUrl: process.env.FRONTEND_URL,
        jwtSecret: process.env.JWT_SECRET,
        cookieOptions: {
            httpOnly: true,
            secure: true, // HTTPS only in production
            sameSite: 'None', // Required for cross-origin cookies
            maxAge: 1000 * 60 * 60 * 24 * 7 // 7 days
        }
    }
};

// Get configuration based on NODE_ENV
export const getConfig = () => {
    const env = process.env.NODE_ENV || 'development';
    return config[env] || config.development;
};

// Validate required environment variables in production
export const validateConfig = () => {
    if (process.env.NODE_ENV === 'production') {
        const required = ['MONGODB_URI', 'JWT_SECRET', 'FRONTEND_URL'];
        const missing = required.filter(key => !process.env[key]);
        
        if (missing.length > 0) {
            throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
        }
    }
};
