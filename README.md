# 🚀 Flutter with Microservices - Finance App

Un proyecto completo de aplicación financiera construido con **Flutter** como frontend móvil y una **arquitectura de microservicios** como backend, utilizando **Docker** para la containerización.

## 📱 Descripción del Proyecto

Esta aplicación permite a los usuarios gestionar sus finanzas personales de manera eficiente, con una arquitectura escalable y moderna que separa responsabilidades entre diferentes servicios.

## 🏗️ Arquitectura del Sistema

### Frontend
- **Flutter** - Aplicación móvil multiplataforma
- **Dart** - Lenguaje de programación

### Backend - Microservicios
- **API Gateway** - Punto de entrada principal (Puerto 8080)
- **Legacy Backend** - Servicio principal de autenticación y transacciones (Puerto 3000)
- **Processing Service** - Servicio de procesamiento de datos (Puerto 8081)
- **Notification Service** - Servicio de notificaciones push y email (Puerto 8082)

### Infraestructura
- **Redis** - Cache y cola de mensajes (Puerto 6379)
- **MongoDB** - Base de datos principal (Puerto 27017)
- **Docker & Docker Compose** - Containerización y orquestación
- **Nginx** - Load balancer (Puerto 80/443)

### Monitoring (Opcional)
- **Prometheus** - Métricas (Puerto 9090)
- **Grafana** - Dashboards (Puerto 3001)

## 🚀 Inicio Rápido

### Prerrequisitos
- **Docker** y **Docker Compose**
- **Flutter SDK** (para desarrollo móvil)
- **Node.js** (para desarrollo de microservicios)
- **Git**

### 1. Clonar el Repositorio
```bash
git clone https://github.com/Andresvrg007/flutterWithMicroservicios.git
cd flutterWithMicroservicios
```

### 2. Configurar Variables de Entorno
```bash
# Copiar el archivo de ejemplo
cp microservices-finance/.env.example microservices-finance/.env

# Editar las variables necesarias
# JWT_SECRET, FCM_SERVER_KEY, EMAIL_USER, EMAIL_PASS, etc.
```

### 3. Iniciar los Microservicios
```bash
cd microservices-finance

# Construir e iniciar todos los servicios
docker-compose up -d

# Ver el estado de los servicios
docker-compose ps

# Ver logs
docker-compose logs -f
```

### 4. Ejecutar la App Flutter
```bash
cd flutter_application

# Instalar dependencias
flutter pub get

# Ejecutar en dispositivo/emulador
flutter run
```

## 📂 Estructura del Proyecto

```
📦 flutterWithMicroservicios/
├── 📱 flutter_application/          # Aplicación móvil Flutter
│   ├── lib/
│   │   ├── main.dart
│   │   ├── models/
│   │   ├── services/
│   │   ├── viewmodels/
│   │   └── views/
│   └── pubspec.yaml
├── 🏗️ backend/                      # Legacy Backend (Node.js)
│   ├── controllers/
│   ├── models/
│   ├── routes/
│   └── index.js
├── 🐳 microservices-finance/        # Arquitectura de Microservicios
│   ├── api-gateway/                 # Puerta de entrada principal
│   ├── processing-service/          # Procesamiento de datos
│   ├── notification-service/        # Notificaciones
│   ├── load-balancer/              # Nginx load balancer
│   ├── monitoring/                 # Prometheus & Grafana
│   └── docker-compose.yml         # Orquestación
└── 📋 scripts/                     # Scripts de automatización
```

## 🔧 Servicios y Puertos

| Servicio | Puerto | Descripción |
|----------|--------|-------------|
| API Gateway | 8080 | Punto de entrada principal |
| Legacy Backend | 3000 | Autenticación y transacciones |
| Processing Service | 8081 | Procesamiento de datos |
| Notification Service | 8082 | Notificaciones |
| Redis | 6379 | Cache y cola de mensajes |
| MongoDB | 27017 | Base de datos principal |
| Nginx Load Balancer | 80/443 | Balanceador de carga |
| Prometheus | 9090 | Métricas |
| Grafana | 3001 | Dashboards |

## 🛠️ Desarrollo

### Comandos Útiles

```bash
# Reconstruir un servicio específico
docker-compose build api-gateway

# Reiniciar un servicio
docker-compose restart processing-service

# Ver logs de un servicio específico
docker-compose logs -f notification-service

# Escalar un servicio
docker-compose up -d --scale processing-service=3

# Parar todos los servicios
docker-compose down

# Parar y eliminar volúmenes
docker-compose down -v
```

### Health Checks

Todos los servicios tienen endpoints de salud:

- API Gateway: http://localhost:8080/health
- Legacy Backend: http://localhost:3000/health
- Processing Service: http://localhost:8081/health
- Notification Service: http://localhost:8082/health


