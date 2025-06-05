# 🩺 DOCKER STATUS CHECKER
# Script para verificar el estado de Docker y los servicios

Write-Host "🔍 =====================================" -ForegroundColor Blue
Write-Host "   VERIFICANDO ESTADO DE DOCKER" -ForegroundColor Blue
Write-Host "=====================================" -ForegroundColor Blue

# Función para mostrar mensaje con color
function Write-StatusMessage {
    param([string]$Message, [string]$Status, [string]$Color = "White")
      $statusIcon = switch ($Status) {
        "OK" { "[OK]" }
        "ERROR" { "[ERROR]" }
        "WARNING" { "[WARNING]" }
        "INFO" { "[INFO]" }
        default { "[CHECK]" }
    }
    
    Write-Host "$statusIcon $Message" -ForegroundColor $Color
}

# Verificar si Docker está instalado
try {
    $dockerVersion = docker --version
    Write-StatusMessage "Docker instalado: $dockerVersion" "OK" "Green"
} catch {
    Write-StatusMessage "Docker no está instalado o no está en PATH" "ERROR" "Red"
    exit 1
}

# Verificar si Docker está corriendo
try {
    docker info *>$null
    if ($LASTEXITCODE -eq 0) {
        Write-StatusMessage "Docker está corriendo correctamente" "OK" "Green"
    } else {
        Write-StatusMessage "Docker no está corriendo. Iniciando Docker Desktop..." "WARNING" "Yellow"
        Write-Host "⏳ Esperando que Docker Desktop se inicie (puede tomar 1-2 minutos)..." -ForegroundColor Yellow
        
        # Intentar iniciar Docker Desktop
        try {
            Start-Process "Docker Desktop" -ErrorAction SilentlyContinue
        } catch {
            Write-StatusMessage "No se pudo iniciar Docker Desktop automáticamente" "WARNING" "Yellow"
            Write-Host "   Por favor, inicia Docker Desktop manualmente" -ForegroundColor Gray
        }
        
        # Esperar hasta que Docker esté disponible
        $attempts = 0
        $maxAttempts = 30
        
        while ($attempts -lt $maxAttempts) {
            Start-Sleep -Seconds 5
            try {
                docker info *>$null
                if ($LASTEXITCODE -eq 0) {
                    Write-StatusMessage "Docker está ahora corriendo" "OK" "Green"
                    break
                }
            } catch {
                # Continuar esperando
            }
            
            $attempts++
            Write-Host "   Esperando... ($attempts/$maxAttempts)" -ForegroundColor Gray
        }
        
        if ($attempts -eq $maxAttempts) {
            Write-StatusMessage "Docker no se inició en el tiempo esperado" "ERROR" "Red"
            Write-Host "   Por favor, inicia Docker Desktop manualmente y ejecuta este script de nuevo" -ForegroundColor Yellow
            exit 1
        }
    }
} catch {
    Write-StatusMessage "Error verificando estado de Docker: $($_.Exception.Message)" "ERROR" "Red"
    exit 1
}

# Verificar Docker Compose
try {
    $composeVersion = docker-compose --version
    Write-StatusMessage "Docker Compose disponible: $composeVersion" "OK" "Green"
} catch {
    Write-StatusMessage "Docker Compose no está disponible" "ERROR" "Red"
    exit 1
}

# Verificar si estamos en el directorio correcto
$expectedDir = "c:\Projects\microservices-finance"
$currentDir = Get-Location

if ($currentDir.Path -ne $expectedDir) {
    Set-Location $expectedDir
    Write-StatusMessage "Cambiado a directorio del proyecto: $expectedDir" "INFO" "Blue"
}

# Verificar si existe docker-compose.yml
if (Test-Path "docker-compose.yml") {
    Write-StatusMessage "Archivo docker-compose.yml encontrado" "OK" "Green"
} else {
    Write-StatusMessage "Archivo docker-compose.yml no encontrado" "ERROR" "Red"
    exit 1
}

# Mostrar estado actual de los contenedores
Write-Host ""
Write-Host "📊 Estado actual de los contenedores:" -ForegroundColor Blue

try {
    $containers = docker-compose ps
    if ($containers) {
        Write-Host $containers
    } else {
        Write-StatusMessage "No hay contenedores en ejecución" "INFO" "Yellow"
    }
} catch {
    Write-StatusMessage "Error obteniendo estado de contenedores: $($_.Exception.Message)" "WARNING" "Yellow"
}

Write-Host ""
Write-Host "🎯 Próximos pasos:" -ForegroundColor Blue
Write-Host "   1. Si Docker está OK, ejecuta: .\scripts\start-services-simple.ps1" -ForegroundColor Gray
Write-Host "   2. Para ver logs: docker-compose logs -f [servicio]" -ForegroundColor Gray
Write-Host "   3. Para parar todo: docker-compose down" -ForegroundColor Gray

Write-Host ""
Write-StatusMessage "Verificación completada" "OK" "Green"
