# SISTEMA DE VERIFICACION SIMPLE
# Script para verificar el estado del sistema sin caracteres especiales

Write-Host "=====================================" -ForegroundColor Blue
Write-Host "   VERIFICACION DEL SISTEMA" -ForegroundColor Blue
Write-Host "=====================================" -ForegroundColor Blue

# Cambiar al directorio del proyecto
Set-Location "c:\Projects\microservices-finance"
Write-Host "Directorio de trabajo: $(Get-Location)" -ForegroundColor Green

# Verificar Docker
Write-Host "`nVerificando Docker..." -ForegroundColor Yellow
try {
    $dockerVersion = docker --version
    Write-Host "[OK] Docker instalado: $dockerVersion" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Docker no esta disponible" -ForegroundColor Red
    exit 1
}

# Verificar estado de contenedores
Write-Host "`nEstado de contenedores:" -ForegroundColor Yellow
try {
    docker-compose ps
} catch {
    Write-Host "[ERROR] No se pudo obtener el estado de contenedores" -ForegroundColor Red
}

# Verificar servicios individuales
Write-Host "`nVerificando servicios..." -ForegroundColor Yellow

$services = @(
    @{ Name = "Load Balancer"; Url = "http://localhost/health" },
    @{ Name = "API Gateway"; Url = "http://localhost:8080/health" },
    @{ Name = "Legacy Backend"; Url = "http://localhost:3000/health" },
    @{ Name = "Processing Service"; Url = "http://localhost:8081/health" },
    @{ Name = "Notification Service"; Url = "http://localhost:8082/health" }
)

$healthyCount = 0
foreach ($service in $services) {
    try {
        $response = Invoke-WebRequest -Uri $service.Url -UseBasicParsing -TimeoutSec 3 -ErrorAction SilentlyContinue
        if ($response.StatusCode -eq 200) {
            Write-Host "[OK] $($service.Name) - Saludable" -ForegroundColor Green
            $healthyCount++
        } else {
            Write-Host "[WARNING] $($service.Name) - Estado: $($response.StatusCode)" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "[ERROR] $($service.Name) - No responde" -ForegroundColor Red
    }
}

# Resumen
Write-Host "`nResumen:" -ForegroundColor Blue
Write-Host "Servicios saludables: $healthyCount/$($services.Count)" -ForegroundColor $(if ($healthyCount -eq $services.Count) { "Green" } else { "Yellow" })

if ($healthyCount -eq $services.Count) {
    Write-Host "SISTEMA COMPLETAMENTE OPERATIVO" -ForegroundColor Green
} elseif ($healthyCount -gt 0) {
    Write-Host "SISTEMA PARCIALMENTE OPERATIVO - Algunos servicios necesitan atencion" -ForegroundColor Yellow
} else {
    Write-Host "SISTEMA NO OPERATIVO - Verificar configuracion" -ForegroundColor Red
}

Write-Host "`nURLs principales:" -ForegroundColor Blue
Write-Host "Load Balancer:     http://localhost" -ForegroundColor Cyan
Write-Host "API Gateway:       http://localhost:8080" -ForegroundColor Cyan
Write-Host "Legacy Backend:    http://localhost:3000" -ForegroundColor Cyan

Write-Host "`nComandos utiles:" -ForegroundColor Blue
Write-Host "Ver logs:          docker-compose logs -f [servicio]" -ForegroundColor Gray
Write-Host "Reiniciar:         docker-compose restart [servicio]" -ForegroundColor Gray
Write-Host "Parar todo:        docker-compose down" -ForegroundColor Gray
