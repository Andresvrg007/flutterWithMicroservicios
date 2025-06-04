# 🔍 DIAGNÓSTICO SIMPLE DE SERVICIOS
# Script para verificar qué servicios están corriendo

Write-Host "🔍 =====================================" -ForegroundColor Yellow
Write-Host "   DIAGNÓSTICO DE SERVICIOS" -ForegroundColor Yellow
Write-Host "=====================================" -ForegroundColor Yellow

# Verificar Docker
Write-Host "🐳 Verificando Docker..." -ForegroundColor Blue
try {
    $dockerInfo = docker info --format "{{.ServerVersion}}"
    Write-Host "✅ Docker corriendo - Versión: $dockerInfo" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker no está corriendo" -ForegroundColor Red
    exit 1
}

# Verificar contenedores corriendo
Write-Host "`n📦 Contenedores en ejecución:" -ForegroundColor Blue
$containers = docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
if ($containers) {
    Write-Host $containers
} else {
    Write-Host "❌ No hay contenedores corriendo" -ForegroundColor Red
}

# Verificar contenedores detenidos
Write-Host "`n🛑 Contenedores detenidos:" -ForegroundColor Blue
$stoppedContainers = docker ps -a --filter "status=exited" --format "table {{.Names}}\t{{.Status}}"
if ($stoppedContainers) {
    Write-Host $stoppedContainers
} else {
    Write-Host "✅ No hay contenedores detenidos" -ForegroundColor Green
}

# Verificar archivos de configuración
Write-Host "`n📄 Verificando archivos de configuración:" -ForegroundColor Blue

if (Test-Path "docker-compose.yml") {
    Write-Host "✅ docker-compose.yml encontrado" -ForegroundColor Green
    
    # Verificar sintaxis del docker-compose
    try {
        docker-compose config --quiet
        Write-Host "✅ docker-compose.yml tiene sintaxis válida" -ForegroundColor Green
    } catch {
        Write-Host "❌ docker-compose.yml tiene errores de sintaxis" -ForegroundColor Red
        Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    }
} else {
    Write-Host "❌ docker-compose.yml no encontrado" -ForegroundColor Red
}

# Verificar puertos
Write-Host "`n🔌 Verificando puertos importantes:" -ForegroundColor Blue
$ports = @(
    @{Port=3000; Service="Legacy Backend"},
    @{Port=6379; Service="Redis"},
    @{Port=27017; Service="MongoDB"},
    @{Port=8080; Service="API Gateway"},
    @{Port=8081; Service="Processing Service 1"},
    @{Port=8082; Service="Notification Service"},
    @{Port=8083; Service="Processing Service 2"},
    @{Port=80; Service="Load Balancer"},
    @{Port=9090; Service="Prometheus"},
    @{Port=3001; Service="Grafana"}
)

foreach ($portInfo in $ports) {
    try {
        $connection = Test-NetConnection -ComputerName "localhost" -Port $portInfo.Port -WarningAction SilentlyContinue
        if ($connection.TcpTestSucceeded) {
            Write-Host "✅ Puerto $($portInfo.Port) ($($portInfo.Service)) - Activo" -ForegroundColor Green
        } else {
            Write-Host "❌ Puerto $($portInfo.Port) ($($portInfo.Service)) - Inactivo" -ForegroundColor Red
        }
    } catch {
        Write-Host "❌ Puerto $($portInfo.Port) ($($portInfo.Service)) - Error de conexión" -ForegroundColor Red
    }
}

# Mostrar logs recientes si hay errores
Write-Host "`n📋 Logs recientes de Docker Compose:" -ForegroundColor Blue
try {
    $logs = docker-compose logs --tail=10
    if ($logs) {
        Write-Host $logs
    } else {
        Write-Host "No hay logs disponibles" -ForegroundColor Yellow
    }
} catch {
    Write-Host "No se pudieron obtener los logs" -ForegroundColor Yellow
}

Write-Host "`n🎯 Próximos pasos recomendados:" -ForegroundColor Blue
Write-Host "   1. Si no hay contenedores: .\scripts\start-services.ps1" -ForegroundColor Gray
Write-Host "   2. Si hay errores: docker-compose logs [servicio]" -ForegroundColor Gray
Write-Host "   3. Para reiniciar: docker-compose down; .\scripts\start-services.ps1" -ForegroundColor Gray
