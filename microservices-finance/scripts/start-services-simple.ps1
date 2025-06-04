# 🚀 SIMPLE START SCRIPT - POWERSHELL COMPATIBLE
# Script simplificado para iniciar los microservicios

Write-Host "🚀 =====================================" -ForegroundColor Green
Write-Host "   INICIANDO MICROSERVICIOS" -ForegroundColor Green  
Write-Host "=====================================" -ForegroundColor Green

# Función para ejecutar comandos de forma segura
function Invoke-DockerCommand {
    param([string]$Command, [string]$Description)
    
    Write-Host "🔄 $Description..." -ForegroundColor Blue
    try {
        Invoke-Expression $Command
        if ($LASTEXITCODE -eq 0 -or $null -eq $LASTEXITCODE) {
            Write-Host "✅ $Description completado" -ForegroundColor Green
            return $true
        } else {
            Write-Host "❌ $Description falló" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "❌ Error en $Description : $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Cambiar al directorio del proyecto
Set-Location "c:\Projects\microservices-finance"
Write-Host "📁 Directorio de trabajo: $(Get-Location)" -ForegroundColor Blue

# Limpiar contenedores existentes
Invoke-DockerCommand "docker-compose down --remove-orphans" "Limpiando contenedores existentes"

# Iniciar servicios base (Redis y MongoDB)
Write-Host "🔨 Iniciando servicios base..." -ForegroundColor Yellow
Invoke-DockerCommand "docker-compose up -d redis mongodb" "Iniciando bases de datos"
Start-Sleep -Seconds 10

# Iniciar backend legacy
Write-Host "🏠 Iniciando backend legacy..." -ForegroundColor Yellow  
Invoke-DockerCommand "docker-compose up -d legacy-backend" "Iniciando backend legacy"
Start-Sleep -Seconds 15

# Iniciar microservicios
Write-Host "⚡ Iniciando microservicios..." -ForegroundColor Yellow
Invoke-DockerCommand "docker-compose up -d processing-service-1 processing-service-2" "Iniciando servicios de procesamiento"
Invoke-DockerCommand "docker-compose up -d notification-service" "Iniciando servicio de notificaciones"
Start-Sleep -Seconds 10

# Iniciar API Gateway
Write-Host "🚪 Iniciando API Gateway..." -ForegroundColor Yellow
Invoke-DockerCommand "docker-compose up -d api-gateway" "Iniciando API Gateway"
Start-Sleep -Seconds 10

# Iniciar Load Balancer
Write-Host "⚖️ Iniciando Load Balancer..." -ForegroundColor Yellow
Invoke-DockerCommand "docker-compose up -d nginx-lb" "Iniciando NGINX Load Balancer"

# Iniciar monitoreo (opcional)
Write-Host "📊 Iniciando servicios de monitoreo..." -ForegroundColor Yellow
Invoke-DockerCommand "docker-compose up -d prometheus grafana" "Iniciando Prometheus y Grafana"

# Esperar que todos los servicios estén listos
Write-Host "⏳ Esperando que todos los servicios estén listos..." -ForegroundColor Blue
Start-Sleep -Seconds 30

# Verificar estado de los servicios
Write-Host "🔍 Verificando estado de servicios..." -ForegroundColor Blue

$services = @(
    @{ Name = "Redis"; Port = "6379" },
    @{ Name = "MongoDB"; Port = "27017" },
    @{ Name = "Legacy Backend"; Port = "3000" },
    @{ Name = "API Gateway"; Port = "8080" },
    @{ Name = "Processing Service 1"; Port = "8081" },
    @{ Name = "Processing Service 2"; Port = "8083" },
    @{ Name = "Notification Service"; Port = "8082" },
    @{ Name = "Load Balancer"; Port = "80" },
    @{ Name = "Prometheus"; Port = "9090" },
    @{ Name = "Grafana"; Port = "3001" }
)

$healthyServices = 0

foreach ($service in $services) {
    try {
        $testUrl = "http://localhost:$($service.Port)"
        if ($service.Port -eq "6379" -or $service.Port -eq "27017") {
            # Para Redis y MongoDB, solo verificamos que el puerto esté abierto
            $connection = Test-NetConnection -ComputerName "localhost" -Port $service.Port -InformationLevel Quiet
            if ($connection) {
                Write-Host "✅ $($service.Name) está corriendo" -ForegroundColor Green
                $healthyServices++
            } else {
                Write-Host "❌ $($service.Name) no está respondiendo" -ForegroundColor Red
            }
        } else {
            # Para servicios HTTP, intentamos acceder al endpoint de health
            $healthUrl = if ($service.Port -eq "80") { "http://localhost/health" } else { "$testUrl/health" }
            $response = Invoke-WebRequest -Uri $healthUrl -UseBasicParsing -TimeoutSec 5 -ErrorAction SilentlyContinue
            if ($response.StatusCode -eq 200) {
                Write-Host "✅ $($service.Name) está saludable" -ForegroundColor Green
                $healthyServices++
            } else {
                Write-Host "⚠️ $($service.Name) responde pero con estado $($response.StatusCode)" -ForegroundColor Yellow
            }
        }
    } catch {
        Write-Host "❌ $($service.Name) no está respondiendo" -ForegroundColor Red
    }
}

# Mostrar resumen
Write-Host "" 
Write-Host "📊 Resumen de Estado:" -ForegroundColor Blue
Write-Host "   Servicios saludables: $healthyServices/$($services.Count)" -ForegroundColor $(if ($healthyServices -eq $services.Count) { "Green" } else { "Yellow" })

if ($healthyServices -eq $services.Count) {
    Write-Host "🎉 ¡Todos los servicios están funcionando correctamente!" -ForegroundColor Green
} elseif ($healthyServices -gt ($services.Count * 0.7)) {
    Write-Host "⚠️ La mayoría de servicios están funcionando" -ForegroundColor Yellow
} else {
    Write-Host "❌ Muchos servicios no están respondiendo. Verifica los logs." -ForegroundColor Red
}

# Mostrar URLs útiles
Write-Host ""
Write-Host "🌐 URLs de Servicios:" -ForegroundColor Blue
Write-Host "   🚪 Load Balancer:     http://localhost" -ForegroundColor Cyan
Write-Host "   🔌 API Gateway:       http://localhost:8080" -ForegroundColor Cyan
Write-Host "   🏠 Legacy Backend:    http://localhost:3000" -ForegroundColor Cyan
Write-Host "   ⚡ Processing 1:      http://localhost:8081" -ForegroundColor Cyan
Write-Host "   ⚡ Processing 2:      http://localhost:8083" -ForegroundColor Cyan
Write-Host "   🔔 Notifications:     http://localhost:8082" -ForegroundColor Cyan
Write-Host "   📊 Prometheus:        http://localhost:9090" -ForegroundColor Cyan
Write-Host "   📈 Grafana:           http://localhost:3001 (admin/admin123)" -ForegroundColor Cyan

Write-Host ""
Write-Host "🛠️ Comandos útiles:" -ForegroundColor Blue
Write-Host "   Ver logs:            docker-compose logs -f [servicio]" -ForegroundColor Gray
Write-Host "   Parar todo:          docker-compose down" -ForegroundColor Gray
Write-Host "   Estado:              docker-compose ps" -ForegroundColor Gray
Write-Host "   Pruebas de carga:    .\scripts\load-test-fixed.ps1" -ForegroundColor Gray

Write-Host ""
Write-Host "✨ ¡Microservicios iniciados! ¡Listos para probar!" -ForegroundColor Green
