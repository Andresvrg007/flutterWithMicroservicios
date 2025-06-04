# ExpenseTracker Backend

Este es el backend de la aplicación ExpenseTracker construido con Node.js, Express y MongoDB.

## 🚀 Configuración para Desarrollo

### Prerrequisitos
- Node.js (v18 o superior)
- MongoDB (local o MongoDB Atlas)
- npm o yarn

### Instalación
1. Clona el repositorio
2. Navega al directorio del backend
3. Instala las dependencias:
```bash
npm install
```

4. Copia el archivo de ejemplo de variables de entorno:
```bash
cp .env.example .env
```

5. Edita el archivo `.env` con tus configuraciones:
```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/expensesApp
JWT_SECRET=tu_jwt_secret_super_seguro
FRONTEND_URL=http://localhost:5173
```

6. Inicia el servidor de desarrollo:
```bash
npm run dev
```

## 📦 Despliegue en Producción

### Variables de Entorno Requeridas
- `PORT`: Puerto del servidor (por defecto 5000)
- `MONGODB_URI`: URI de conexión a MongoDB
- `JWT_SECRET`: Clave secreta para JWT (¡CAMBIA ESTO EN PRODUCCIÓN!)
- `FRONTEND_URL`: URL del frontend para configurar CORS

### MongoDB Atlas (Recomendado para producción)
1. Crea una cuenta en [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Crea un nuevo cluster
3. Obtén la connection string y actualiza `MONGODB_URI`:
```
mongodb+srv://username:password@cluster.mongodb.net/expensesApp?retryWrites=true&w=majority
```

### Plataformas de Despliegue

#### Render
1. Conecta tu repositorio de GitHub
2. Configura las variables de entorno en el dashboard
3. Usa el comando de build: `npm install`
4. Usa el comando de start: `npm start`

#### Railway
1. Conecta tu repositorio
2. Configura las variables de entorno
3. Railway detectará automáticamente el package.json

#### Heroku
1. Instala Heroku CLI
2. Crea una nueva app: `heroku create tu-app-name`
3. Configura las variables de entorno: `heroku config:set MONGODB_URI=...`
4. Despliega: `git push heroku main`

## 🔒 Seguridad

- Siempre usa HTTPS en producción
- Genera un JWT_SECRET fuerte y único
- Configura correctamente el CORS con tu dominio frontend
- No commites el archivo `.env` al control de versiones

## 📁 Estructura del Proyecto

```
backend/
├── config/
│   └── database.js       # Configuración de MongoDB
├── controllers/          # Lógica de negocio
├── models/              # Modelos de Mongoose
├── routes/              # Rutas de la API
├── .env.example         # Variables de entorno de ejemplo
├── .gitignore
├── index.js             # Punto de entrada
└── package.json
```

## 🛠 Scripts Disponibles

- `npm start`: Inicia el servidor en producción
- `npm run dev`: Inicia el servidor con nodemon para desarrollo
- `npm test`: Ejecuta las pruebas (por implementar)

## 📚 API Endpoints

### Autenticación
- `POST /api/register` - Registrar usuario
- `POST /api/login` - Iniciar sesión
- `GET /api/verify` - Verificar autenticación
- `POST /api/logout` - Cerrar sesión

### Transacciones
- `POST /api/transaction` - Crear transacción
- `GET /api/transactions-summary` - Obtener resumen de transacciones
- `POST /api/reset-monthly` - Resetear transacciones mensuales

### Usuario
- `POST /api/password` - Cambiar contraseña
- `GET /api/profile` - Obtener perfil del usuario