# SCRIPT DE PRUEBAS DE CARGA SIMPLIFICADO
# Sin caracteres especiales problematicos

param(
    [string]$TestType = "quick",
    [int]$Duration = 30,
    [int]$Concurrency = 5,
    [string]$BaseUrl = "http://localhost"
)

Write-Host "=====================================" -ForegroundColor Red
Write-Host "   PRUEBAS DE CARGA - MICROSERVICIOS" -ForegroundColor Red
Write-Host "=====================================" -ForegroundColor Red

Write-Host "Configuracion:" -ForegroundColor Yellow
Write-Host "Tipo: $TestType" -ForegroundColor White
Write-Host "Duracion: ${Duration}s" -ForegroundColor White
Write-Host "Concurrencia: $Concurrency" -ForegroundColor White
Write-Host "URL Base: $BaseUrl" -ForegroundColor White
Write-Host ""

# Función para hacer peticiones HTTP
function Invoke-TestRequest {
    param(
        [string]$Url,
        [string]$Method = "GET",
        [hashtable]$Headers = @{},
        [string]$Body = $null,
        [int]$TimeoutSec = 10
    )
    
    try {
        $requestParams = @{
            Uri = "$BaseUrl$Url"
            Method = $Method
            TimeoutSec = $TimeoutSec
            UseBasicParsing = $true
            ErrorAction = "Stop"
        }
        
        if ($Headers.Count -gt 0) {
            $requestParams.Headers = $Headers
        }
        
        if ($Body -and $Method -in @("POST", "PUT", "PATCH")) {
            $requestParams.Body = $Body
            if (-not $Headers.ContainsKey("Content-Type")) {
                if (-not $requestParams.Headers) {
                    $requestParams.Headers = @{}
                }
                $requestParams.Headers["Content-Type"] = "application/json"
            }
        }
        
        $startTime = Get-Date
        $response = Invoke-WebRequest @requestParams
        $endTime = Get-Date
        $duration = ($endTime - $startTime).TotalMilliseconds
        
        return @{
            Success = $true
            StatusCode = $response.StatusCode
            Duration = $duration
            Error = $null
        }
    }
    catch {
        $endTime = Get-Date
        $duration = if ($startTime) { ($endTime - $startTime).TotalMilliseconds } else { 0 }
        
        return @{
            Success = $false
            StatusCode = 0
            Duration = $duration
            Error = $_.Exception.Message
        }
    }
}

# Función para mostrar resultados
function Show-TestResults {
    param([array]$Results, [string]$TestName)
    
    if ($Results.Count -eq 0) {
        Write-Host "[WARNING] No hay resultados para $TestName" -ForegroundColor Yellow
        return
    }
    
    $successCount = ($Results | Where-Object { $_.Success }).Count
    $failureCount = $Results.Count - $successCount
    $successRate = [Math]::Round(($successCount / $Results.Count) * 100, 2)
    
    $durations = $Results | Where-Object { $_.Success } | ForEach-Object { $_.Duration }
    if ($durations.Count -gt 0) {
        $avgDuration = [Math]::Round(($durations | Measure-Object -Average).Average, 2)
        $minDuration = [Math]::Round(($durations | Measure-Object -Minimum).Minimum, 2)
        $maxDuration = [Math]::Round(($durations | Measure-Object -Maximum).Maximum, 2)
    } else {
        $avgDuration = $minDuration = $maxDuration = 0
    }
    
    Write-Host "Resultados para $TestName" -ForegroundColor Green
    Write-Host "  Total Peticiones: $($Results.Count)" -ForegroundColor White
    Write-Host "  Exitosas: $successCount ($successRate%)" -ForegroundColor $(if ($successRate -ge 95) { "Green" } else { "Yellow" })
    Write-Host "  Fallidas: $failureCount" -ForegroundColor $(if ($failureCount -eq 0) { "Green" } else { "Red" })
    Write-Host "  Tiempo Promedio: ${avgDuration}ms" -ForegroundColor White
    Write-Host "  Tiempo Minimo: ${minDuration}ms" -ForegroundColor White
    Write-Host "  Tiempo Maximo: ${maxDuration}ms" -ForegroundColor White
    Write-Host ""
}

# Verificar disponibilidad antes de las pruebas
Write-Host "Verificando disponibilidad de servicios..." -ForegroundColor Yellow

try {
    $response = Invoke-WebRequest -Uri "$BaseUrl/health" -UseBasicParsing -TimeoutSec 10 -ErrorAction SilentlyContinue
    Write-Host "[OK] Load Balancer respondiendo (Status: $($response.StatusCode))" -ForegroundColor Green
}
catch {
    Write-Host "[ERROR] Load Balancer no disponible, probando API Gateway..." -ForegroundColor Yellow
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8080/health" -UseBasicParsing -TimeoutSec 10
        Write-Host "[OK] API Gateway respondiendo (Status: $($response.StatusCode))" -ForegroundColor Green
        $BaseUrl = "http://localhost:8080"
    }
    catch {
        Write-Host "[ERROR] Servicios no disponibles. Asegurate de ejecutar start-services.ps1 primero" -ForegroundColor Red
        exit 1
    }
}

# Calcular peticiones por prueba
$requestsPerTest = [Math]::Max(5, [Math]::Ceiling($Duration / 5))
Write-Host "Peticiones por prueba: $requestsPerTest" -ForegroundColor Gray
Write-Host ""

# EJECUTAR PRUEBAS
Write-Host "Iniciando pruebas de carga..." -ForegroundColor Green

# Prueba 1: Health Check
Write-Host "Probando Health Endpoint..." -ForegroundColor Cyan
$healthResults = @()
for ($i = 0; $i -lt $requestsPerTest; $i++) {
    $result = Invoke-TestRequest -Url "/health" -Method "GET"
    $healthResults += $result
    
    if ($i % 5 -eq 0) {
        $percent = [Math]::Round(($i / $requestsPerTest) * 100, 1)
        Write-Progress -Activity "Health Check Test" -Status "Progreso $percent%" -PercentComplete $percent
    }
    
    Start-Sleep -Milliseconds 100
}
Write-Progress -Activity "Health Check Test" -Completed
Show-TestResults -Results $healthResults -TestName "Health Check"

# Prueba 2: API Gateway
Write-Host "Probando API Gateway..." -ForegroundColor Cyan
$apiResults = @()
$headers = @{"Authorization" = "Bearer test-token"}

for ($i = 0; $i -lt $requestsPerTest; $i++) {
    $result = Invoke-TestRequest -Url "/api/transactions" -Method "GET" -Headers $headers
    $apiResults += $result
    
    if ($i % 5 -eq 0) {
        $percent = [Math]::Round(($i / $requestsPerTest) * 100, 1)
        Write-Progress -Activity "API Gateway Test" -Status "Progreso $percent%" -PercentComplete $percent
    }
    
    Start-Sleep -Milliseconds 150
}
Write-Progress -Activity "API Gateway Test" -Completed
Show-TestResults -Results $apiResults -TestName "API Gateway"

# Prueba 3: Servicio de Procesamiento
Write-Host "Probando Servicio de Procesamiento..." -ForegroundColor Cyan
$processingResults = @()
$jobData = '{"type":"calculation","data":{"transactions":[{"amount":100,"date":"2025-06-01"}]}}'
$headers = @{"Authorization" = "Bearer test-token"; "Content-Type" = "application/json"}

for ($i = 0; $i -lt ([Math]::Max(3, [Math]::Ceiling($requestsPerTest * 0.5))); $i++) {
    $result = Invoke-TestRequest -Url "/api/processing/jobs" -Method "POST" -Body $jobData -Headers $headers
    $processingResults += $result
    
    if ($i % 2 -eq 0) {
        $percent = [Math]::Round(($i / ([Math]::Max(3, [Math]::Ceiling($requestsPerTest * 0.5)))) * 100, 1)
        Write-Progress -Activity "Processing Test" -Status "Progreso $percent%" -PercentComplete $percent
    }
    
    Start-Sleep -Milliseconds 300
}
Write-Progress -Activity "Processing Test" -Completed
Show-TestResults -Results $processingResults -TestName "Servicio de Procesamiento"

# RESUMEN FINAL
Write-Host "=====================================" -ForegroundColor Blue
Write-Host "RESUMEN DE PRUEBAS COMPLETADO" -ForegroundColor Blue
Write-Host "=====================================" -ForegroundColor Blue

$allResults = $healthResults + $apiResults + $processingResults
$totalRequests = $allResults.Count
$totalSuccess = ($allResults | Where-Object { $_.Success }).Count
$overallSuccessRate = if ($totalRequests -gt 0) { [Math]::Round(($totalSuccess / $totalRequests) * 100, 2) } else { 0 }

Write-Host "Total Peticiones: $totalRequests" -ForegroundColor White
Write-Host "Total Exitosas: $totalSuccess" -ForegroundColor White
Write-Host "Tasa de Exito General: $overallSuccessRate%" -ForegroundColor $(if ($overallSuccessRate -ge 95) { "Green" } elseif ($overallSuccessRate -ge 85) { "Yellow" } else { "Red" })

if ($overallSuccessRate -ge 95) {
    Write-Host "[EXCELENTE] Todas las pruebas pasaron con excelente rendimiento!" -ForegroundColor Green
} elseif ($overallSuccessRate -ge 85) {
    Write-Host "[BUENO] Las pruebas pasaron pero se detectaron algunos problemas menores" -ForegroundColor Yellow
} else {
    Write-Host "[PROBLEMA] Se detectaron problemas de rendimiento - revisar configuracion" -ForegroundColor Red
}

Write-Host ""
Write-Host "Comandos utiles:" -ForegroundColor Blue
Write-Host "  Ver logs:              docker-compose logs -f [servicio]" -ForegroundColor Gray
Write-Host "  Reiniciar servicios:   .\scripts\start-services-simple.ps1" -ForegroundColor Gray
Write-Host "  Estado servicios:      docker-compose ps" -ForegroundColor Gray
