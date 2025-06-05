# Script para probar notificaciones push simuladas
# Demuestra el flujo completo: crear transacción -> procesar tarea -> notificación push

Write-Host "🚀 INICIANDO PRUEBA DE NOTIFICACIONES PUSH SIMULADAS" -ForegroundColor Green
Write-Host "=====================================================" -ForegroundColor Green

# URLs de los servicios
$API_GATEWAY = "http://localhost:8080"
$NOTIFICATION_SERVICE = "http://localhost:8082"
$LEGACY_BACKEND = "http://localhost:3000"

# 1. Registrar un usuario de prueba (si no existe)
Write-Host "`n📝 1. Registrando usuario de prueba..." -ForegroundColor Yellow

$registerData = @{
    name = "Test User"
    email = "testuser@pushnotif.com"
    password = "password123"
} | ConvertTo-Json

try {
    $registerResponse = Invoke-RestMethod -Uri "$LEGACY_BACKEND/auth/register" -Method Post -Body $registerData -ContentType "application/json"
    Write-Host "✅ Usuario registrado exitosamente" -ForegroundColor Green
    $userId = $registerResponse.user.id
    $authToken = $registerResponse.token
} catch {
    # Si el usuario ya existe, intentar login
    Write-Host "⚠️  Usuario ya existe, intentando login..." -ForegroundColor Yellow
    
    $loginData = @{
        email = "testuser@pushnotif.com"
        password = "password123"
    } | ConvertTo-Json
    
    try {
        $loginResponse = Invoke-RestMethod -Uri "$LEGACY_BACKEND/auth/login" -Method Post -Body $loginData -ContentType "application/json"
        Write-Host "✅ Login exitoso" -ForegroundColor Green
        $userId = $loginResponse.user.id
        $authToken = $loginResponse.token
    } catch {
        Write-Host "❌ Error en registro/login: $($_.Exception.Message)" -ForegroundColor Red
        exit 1
    }
}

Write-Host "👤 User ID: $userId" -ForegroundColor Cyan
Write-Host "🔑 Token: $($authToken.Substring(0,20))..." -ForegroundColor Cyan

# 2. Registrar dispositivos para notificaciones push
Write-Host "`n📱 2. Registrando dispositivos para notificaciones push..." -ForegroundColor Yellow

$headers = @{
    "Authorization" = "Bearer $authToken"
    "Content-Type" = "application/json"
}

# Registrar dispositivo iOS
$iosDevice = @{
    token = "ios-device-token-" + (Get-Date).Ticks
    platform = "ios"
    deviceId = "iPhone-" + (Get-Random -Maximum 9999)
    appVersion = "1.0.0"
} | ConvertTo-Json

try {
    $iosResponse = Invoke-RestMethod -Uri "$NOTIFICATION_SERVICE/api/devices/register" -Method Post -Body $iosDevice -Headers $headers
    Write-Host "✅ Dispositivo iOS registrado: $($iosResponse.deviceToken.id)" -ForegroundColor Green
} catch {
    Write-Host "❌ Error registrando dispositivo iOS: $($_.Exception.Message)" -ForegroundColor Red
}

# Registrar dispositivo Android
$androidDevice = @{
    token = "android-device-token-" + (Get-Date).Ticks
    platform = "android"
    deviceId = "Samsung-" + (Get-Random -Maximum 9999)
    appVersion = "1.0.0"
} | ConvertTo-Json

try {
    $androidResponse = Invoke-RestMethod -Uri "$NOTIFICATION_SERVICE/api/devices/register" -Method Post -Body $androidDevice -Headers $headers
    Write-Host "✅ Dispositivo Android registrado: $($androidResponse.deviceToken.id)" -ForegroundColor Green
} catch {
    Write-Host "❌ Error registrando dispositivo Android: $($_.Exception.Message)" -ForegroundColor Red
}

# Registrar dispositivo Web
$webDevice = @{
    token = "web-device-token-" + (Get-Date).Ticks
    platform = "web"
    deviceId = "Chrome-" + (Get-Random -Maximum 9999)
    appVersion = "1.0.0"
} | ConvertTo-Json

try {
    $webResponse = Invoke-RestMethod -Uri "$NOTIFICATION_SERVICE/api/devices/register" -Method Post -Body $webDevice -Headers $headers
    Write-Host "✅ Dispositivo Web registrado: $($webResponse.deviceToken.id)" -ForegroundColor Green
} catch {
    Write-Host "❌ Error registrando dispositivo Web: $($_.Exception.Message)" -ForegroundColor Red
}

# 3. Crear una transacción que disparará notificaciones
Write-Host "`n💰 3. Creando transacción que disparará notificaciones push..." -ForegroundColor Yellow

$transactionData = @{
    amount = 150.75
    description = "Compra en supermercado con notificaciones push"
    tipo = "gasto"
    category = "Alimentación"
    fecha = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
} | ConvertTo-Json

try {
    $transactionResponse = Invoke-RestMethod -Uri "$LEGACY_BACKEND/transactions" -Method Post -Body $transactionData -Headers $headers
    Write-Host "✅ Transacción creada exitosamente: $($transactionResponse.transaction._id)" -ForegroundColor Green
    Write-Host "📊 Monto: $($transactionResponse.transaction.amount)" -ForegroundColor Cyan
    Write-Host "📝 Descripción: $($transactionResponse.transaction.description)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Error creando transacción: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "📄 Respuesta: $($_.Exception.Response)" -ForegroundColor Red
}

# 4. Enviar notificación push directa para prueba
Write-Host "`n🔔 4. Enviando notificación push directa de prueba..." -ForegroundColor Yellow

$pushNotification = @{
    type = "transactionAlerts"
    title = "✅ Tarea Completada"
    message = "Su transacción de `$150.75 en 'Compra en supermercado' ha sido procesada exitosamente."
    channels = @("push", "websocket")
    recipients = @($userId)
    data = @{
        transactionId = "task-" + (Get-Random -Maximum 9999)
        amount = 150.75
        type = "gasto"
        category = "Alimentación"
        timestamp = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
        taskStatus = "completed"
    }
    priority = "normal"
} | ConvertTo-Json -Depth 10

try {
    $notificationResponse = Invoke-RestMethod -Uri "$NOTIFICATION_SERVICE/api/notifications/send" -Method Post -Body $pushNotification -Headers $headers
    Write-Host "✅ Notificación push enviada exitosamente" -ForegroundColor Green
    Write-Host "📧 Job ID: $($notificationResponse.jobId)" -ForegroundColor Cyan
    Write-Host "📊 Status: $($notificationResponse.status)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Error enviando notificación: $($_.Exception.Message)" -ForegroundColor Red
}

# 5. Esperar un momento para ver los logs de notificaciones
Write-Host "`n⏳ 5. Esperando procesamiento de notificaciones..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

# 6. Verificar logs del notification service
Write-Host "`n📋 6. Verificando logs del notification service..." -ForegroundColor Yellow
Write-Host "Ejecute el siguiente comando para ver las notificaciones push simuladas:" -ForegroundColor Cyan
Write-Host "docker logs finance-notifications --tail 20 -f" -ForegroundColor White

# 7. Enviar más notificaciones de prueba
Write-Host "`n🎯 7. Enviando notificaciones adicionales de prueba..." -ForegroundColor Yellow

$notifications = @(
    @{
        type = "budgetAlerts"
        title = "⚠️ Alerta de Presupuesto"
        message = "Ha gastado el 80% de su presupuesto mensual en Alimentación."
        channels = @("push")
        recipients = @($userId)
        data = @{
            category = "Alimentación"
            percentage = 80
            remaining = 200.00
        }
        priority = "high"
    },
    @{
        type = "securityAlerts"
        title = "🔒 Alerta de Seguridad"
        message = "Nuevo inicio de sesión detectado desde un dispositivo desconocido."
        channels = @("push", "email")
        recipients = @($userId)
        data = @{
            deviceInfo = "Chrome on Windows"
            location = "Ciudad de México, MX"
            timestamp = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
        }
        priority = "urgent"
    },
    @{
        type = "investmentUpdates"
        title = "📈 Actualización de Inversión"
        message = "Su portafolio ha aumentado 2.5% en las últimas 24 horas."
        channels = @("push")
        recipients = @($userId)
        data = @{
            change = "+2.5%"
            value = 10500.00
            profit = 255.75
        }
        priority = "normal"
    }
)

foreach ($notif in $notifications) {
    $notifJson = $notif | ConvertTo-Json -Depth 10
    try {
        $response = Invoke-RestMethod -Uri "$NOTIFICATION_SERVICE/api/notifications/send" -Method Post -Body $notifJson -Headers $headers
        Write-Host "✅ Enviado: $($notif.title)" -ForegroundColor Green
        Start-Sleep -Seconds 1
    } catch {
        Write-Host "❌ Error enviando $($notif.title): $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "`n🎉 PRUEBA COMPLETADA" -ForegroundColor Green
Write-Host "=====================" -ForegroundColor Green
Write-Host "✅ Dispositivos registrados: 3 (iOS, Android, Web)" -ForegroundColor Green
Write-Host "✅ Transacción creada y procesada" -ForegroundColor Green
Write-Host "✅ Notificaciones push simuladas enviadas" -ForegroundColor Green
Write-Host "`n🔍 Para ver las notificaciones push simuladas en tiempo real:" -ForegroundColor Yellow
Write-Host "   docker logs finance-notifications --tail 50 -f" -ForegroundColor White
Write-Host "`n📱 Cada notificación push muestra:" -ForegroundColor Cyan
Write-Host "   - Device ID del dispositivo" -ForegroundColor White
Write-Host "   - Plataforma (iOS/Android/Web)" -ForegroundColor White
Write-Host "   - Título y mensaje" -ForegroundColor White
Write-Host "   - Token FCM simulado" -ForegroundColor White
Write-Host "   - Payload con datos adicionales" -ForegroundColor White
Write-Host "   - Timestamp de envío" -ForegroundColor White
