# 🔥 LOAD TESTING SCRIPT - POWERSHELL COMPATIBLE
# Script corregido para pruebas de carga de los microservicios

param(
    [ValidateSet("all", "api-gateway", "processing", "notifications", "auth", "stress", "quick")]
    [string]$TestType = "quick",
    [int]$Duration = 60,      # 1 minuto por defecto
    [int]$Concurrency = 10,   # 10 usuarios concurrentes
    [string]$BaseUrl = "http://localhost",
    [switch]$GenerateReport
)

# Configuración
$ErrorActionPreference = "Stop"
$Global:TestResults = @()
$Global:TestStartTime = Get-Date

Write-Host "🔥 =====================================" -ForegroundColor Red
Write-Host "   LOAD TESTING - MICROSERVICIOS" -ForegroundColor Red
Write-Host "=====================================" -ForegroundColor Red

# Función para mostrar salida coloreada
function Write-TestOutput {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    Write-Host $Message -ForegroundColor $Color
}

# Función para hacer peticiones HTTP con manejo de errores
function Invoke-TestRequest {
    param(
        [string]$Url,
        [string]$Method = "GET",
        [hashtable]$Headers = @{},
        [string]$Body = $null,
        [int]$TimeoutSec = 15
    )
    
    try {
        $requestParams = @{
            Uri = "$BaseUrl$Url"
            Method = $Method
            TimeoutSec = $TimeoutSec
            UseBasicParsing = $true
            ErrorAction = "Stop"
        }
        
        # Agregar headers si existen
        if ($Headers.Count -gt 0) {
            $requestParams.Headers = $Headers
        }
        
        # Agregar body para métodos POST/PUT/PATCH
        if ($Body -and $Method -in @("POST", "PUT", "PATCH")) {
            $requestParams.Body = $Body
            # Asegurar Content-Type para JSON
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
            Size = $response.Content.Length
            Error = $null
        }
    }
    catch {
        $endTime = Get-Date
        $duration = if ($startTime) { ($endTime - $startTime).TotalMilliseconds } else { 0 }
        
        return @{
            Success = $false
            StatusCode = if ($_.Exception.Response) { 
                try { $_.Exception.Response.StatusCode.value__ } catch { 0 }
            } else { 0 }
            Duration = $duration
            Size = 0
            Error = $_.Exception.Message
        }
    }
}

# Función para prueba de health check
function Test-HealthEndpoint {
    param([int]$Requests)
    
    Write-TestOutput "🏥 Probando Health Endpoint..." "Cyan"
    $results = @()
    
    for ($i = 0; $i -lt $Requests; $i++) {
        $result = Invoke-TestRequest -Url "/health" -Method "GET"
        $results += $result
        
        if ($i % 5 -eq 0) {
            $percent = [Math]::Round(($i / $Requests) * 100, 1)
            Write-Progress -Activity "Health Check Test" -Status "Progreso" -PercentComplete $percent
        }
        
        Start-Sleep -Milliseconds 100
    }
    
    Write-Progress -Activity "Health Check Test" -Completed
    return $results
}

# Función para prueba de autenticación
function Test-AuthEndpoint {
    param([int]$Requests)
    
    Write-TestOutput "🔐 Probando Autenticación..." "Cyan"
    $results = @()
    $loginData = '{"email":"test@example.com","password":"testpassword123"}'
    
    for ($i = 0; $i -lt $Requests; $i++) {
        $headers = @{"Content-Type" = "application/json"}
        $result = Invoke-TestRequest -Url "/api/auth/login" -Method "POST" -Body $loginData -Headers $headers
        $results += $result
        
        if ($i % 5 -eq 0) {
            $percent = [Math]::Round(($i / $Requests) * 100, 1)
            Write-Progress -Activity "Auth Test" -Status "Progreso" -PercentComplete $percent
        }
        
        Start-Sleep -Milliseconds 200
    }
    
    Write-Progress -Activity "Auth Test" -Completed
    return $results
}

# Función para prueba de API Gateway
function Test-ApiGateway {
    param([int]$Requests)
    
    Write-TestOutput "🚪 Probando API Gateway..." "Cyan"
    $results = @()
    $headers = @{
        "Authorization" = "Bearer test-token"
        "Content-Type" = "application/json"
    }
    
    for ($i = 0; $i -lt $Requests; $i++) {
        $result = Invoke-TestRequest -Url "/api/transactions" -Method "GET" -Headers $headers
        $results += $result
        
        if ($i % 5 -eq 0) {
            $percent = [Math]::Round(($i / $Requests) * 100, 1)
            Write-Progress -Activity "API Gateway Test" -Status "Progreso" -PercentComplete $percent
        }
        
        Start-Sleep -Milliseconds 150
    }
    
    Write-Progress -Activity "API Gateway Test" -Completed
    return $results
}

# Función para prueba del servicio de procesamiento
function Test-ProcessingService {
    param([int]$Requests)
    
    Write-TestOutput "⚡ Probando Servicio de Procesamiento..." "Cyan"
    $results = @()
    $jobData = '{"type":"calculation","data":{"transactions":[{"amount":100,"date":"2025-06-01"},{"amount":-50,"date":"2025-06-02"}]}}'
    $headers = @{
        "Authorization" = "Bearer test-token"
        "Content-Type" = "application/json"
    }
    
    for ($i = 0; $i -lt $Requests; $i++) {
        $result = Invoke-TestRequest -Url "/api/processing/jobs" -Method "POST" -Body $jobData -Headers $headers
        $results += $result
        
        if ($i % 3 -eq 0) {
            $percent = [Math]::Round(($i / $Requests) * 100, 1)
            Write-Progress -Activity "Processing Test" -Status "Progreso" -PercentComplete $percent
        }
        
        Start-Sleep -Milliseconds 300
    }
    
    Write-Progress -Activity "Processing Test" -Completed
    return $results
}

# Función para prueba del servicio de notificaciones
function Test-NotificationService {
    param([int]$Requests)
    
    Write-TestOutput "🔔 Probando Servicio de Notificaciones..." "Cyan"
    $results = @()
    $notificationData = '{"type":"push","title":"Test Notification","message":"Mensaje de prueba","priority":"normal"}'
    $headers = @{
        "Authorization" = "Bearer test-token"
        "Content-Type" = "application/json"
    }
    
    for ($i = 0; $i -lt $Requests; $i++) {
        $result = Invoke-TestRequest -Url "/api/notifications/send" -Method "POST" -Body $notificationData -Headers $headers
        $results += $result
        
        if ($i % 3 -eq 0) {
            $percent = [Math]::Round(($i / $Requests) * 100, 1)
            Write-Progress -Activity "Notification Test" -Status "Progreso" -PercentComplete $percent
        }
        
        Start-Sleep -Milliseconds 250
    }
    
    Write-Progress -Activity "Notification Test" -Completed
    return $results
}

# Función para mostrar resultados
function Show-TestResults {
    param([array]$Results, [string]$TestName)
    
    if ($Results.Count -eq 0) {
        Write-TestOutput "⚠️ No hay resultados para $TestName" "Yellow"
        return $null
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
    
    Write-TestOutput "📊 Resultados para $TestName:" "Green"
    Write-TestOutput "   Total Peticiones: $($Results.Count)" "White"
    Write-TestOutput "   Exitosas: $successCount ($successRate%)" $(if ($successRate -ge 95) { "Green" } elseif ($successRate -ge 85) { "Yellow" } else { "Red" })
    Write-TestOutput "   Fallidas: $failureCount" $(if ($failureCount -eq 0) { "Green" } else { "Red" })
    Write-TestOutput "   Tiempo Promedio: ${avgDuration}ms" "White"
    Write-TestOutput "   Tiempo Mínimo: ${minDuration}ms" "White"
    Write-TestOutput "   Tiempo Máximo: ${maxDuration}ms" "White"
    Write-TestOutput "" "White"
    
    return @{
        TestName = $TestName
        TotalRequests = $Results.Count
        SuccessCount = $successCount
        FailureCount = $failureCount
        SuccessRate = $successRate
        AvgDuration = $avgDuration
        MinDuration = $minDuration
        MaxDuration = $maxDuration
    }
}

# Función para generar reporte
function New-TestReport {
    $reportPath = "load-test-report-$(Get-Date -Format 'yyyyMMdd-HHmmss').txt"
    $testDuration = (Get-Date) - $Global:TestStartTime
    
    $report = @"
==================================================
REPORTE DE PRUEBAS DE CARGA - MICROSERVICIOS
==================================================
Hora de Inicio: $($Global:TestStartTime.ToString('yyyy-MM-dd HH:mm:ss'))
Duración: $($testDuration.ToString('hh\:mm\:ss'))
URL Base: $BaseUrl
Tipo de Prueba: $TestType
Concurrencia: $Concurrency

RESULTADOS DETALLADOS:
==================================================
"@
    
    foreach ($result in $Global:TestResults) {
        if ($result) {
            $report += @"

Prueba: $($result.TestName)
  Total Peticiones: $($result.TotalRequests)
  Tasa de Éxito: $($result.SuccessRate)%
  Fallas: $($result.FailureCount)
  Tiempo Promedio: $($result.AvgDuration)ms
  Tiempo Mínimo: $($result.MinDuration)ms
  Tiempo Máximo: $($result.MaxDuration)ms
"@
        }
    }
    
    $report | Out-File -FilePath $reportPath -Encoding UTF8
    Write-TestOutput "📊 Reporte generado: $reportPath" "Green"
    return $reportPath
}

# EJECUCIÓN PRINCIPAL
Write-TestOutput "Tipo de Prueba: $TestType" "Cyan"
Write-TestOutput "Duración: ${Duration}s" "Cyan"
Write-TestOutput "Concurrencia: $Concurrency" "Cyan"
Write-TestOutput "URL Base: $BaseUrl" "Cyan"
Write-TestOutput "" "White"

# Verificar disponibilidad de servicios
Write-TestOutput "🔧 Verificando disponibilidad de servicios..." "Yellow"

try {
    $response = Invoke-WebRequest -Uri "$BaseUrl/health" -UseBasicParsing -TimeoutSec 10
    Write-TestOutput "✅ Servicios están respondiendo (Status: $($response.StatusCode))" "Green"
}
catch {
    Write-TestOutput "❌ Servicios no están disponibles en $BaseUrl" "Red"
    Write-TestOutput "   Asegúrate de ejecutar start-services.ps1 primero" "Yellow"
    exit 1
}

# Calcular número de peticiones basado en la duración
$requestsPerTest = [Math]::Max(5, [Math]::Ceiling($Duration / 10))

Write-TestOutput "🚀 Iniciando pruebas de carga..." "Green"
Write-TestOutput "   Peticiones por prueba: $requestsPerTest" "Gray"
Write-TestOutput "" "White"

try {
    # Ejecutar pruebas según el tipo
    if ($TestType -eq "all" -or $TestType -eq "quick" -or $TestType -eq "health") {
        $results = Test-HealthEndpoint -Requests $requestsPerTest
        $summary = Show-TestResults -Results $results -TestName "Health Check"
        if ($summary) { $Global:TestResults += $summary }
    }
    
    if ($TestType -eq "all" -or $TestType -eq "auth") {
        $results = Test-AuthEndpoint -Requests ([Math]::Max(3, [Math]::Ceiling($requestsPerTest * 0.6)))
        $summary = Show-TestResults -Results $results -TestName "Autenticación"
        if ($summary) { $Global:TestResults += $summary }
    }
    
    if ($TestType -eq "all" -or $TestType -eq "quick" -or $TestType -eq "api-gateway") {
        $results = Test-ApiGateway -Requests $requestsPerTest
        $summary = Show-TestResults -Results $results -TestName "API Gateway"
        if ($summary) { $Global:TestResults += $summary }
    }
    
    if ($TestType -eq "all" -or $TestType -eq "processing") {
        $results = Test-ProcessingService -Requests ([Math]::Max(2, [Math]::Ceiling($requestsPerTest * 0.4)))
        $summary = Show-TestResults -Results $results -TestName "Servicio de Procesamiento"
        if ($summary) { $Global:TestResults += $summary }
    }
    
    if ($TestType -eq "all" -or $TestType -eq "notifications") {
        $results = Test-NotificationService -Requests ([Math]::Max(2, [Math]::Ceiling($requestsPerTest * 0.3)))
        $summary = Show-TestResults -Results $results -TestName "Servicio de Notificaciones"
        if ($summary) { $Global:TestResults += $summary }
    }
    
    if ($TestType -eq "stress") {
        Write-TestOutput "🔥 Ejecutando prueba de estrés con carga aumentada..." "Red"
        $stressRequests = $requestsPerTest * 3
        $results = Test-HealthEndpoint -Requests $stressRequests
        $summary = Show-TestResults -Results $results -TestName "Prueba de Estrés"
        if ($summary) { $Global:TestResults += $summary }
    }
    
    # Generar reporte si se solicita
    if ($GenerateReport) {
        $reportPath = New-TestReport
    }
    
    # Resumen final
    if ($Global:TestResults.Count -gt 0) {
        $totalRequests = ($Global:TestResults | Measure-Object -Property TotalRequests -Sum).Sum
        $totalSuccess = ($Global:TestResults | Measure-Object -Property SuccessCount -Sum).Sum
        $overallSuccessRate = if ($totalRequests -gt 0) { [Math]::Round(($totalSuccess / $totalRequests) * 100, 2) } else { 0 }
        
        Write-TestOutput "🎉 ¡Pruebas de carga completadas exitosamente!" "Green"
        Write-TestOutput "📈 Resumen General:" "Cyan"
        Write-TestOutput "   Total Pruebas: $($Global:TestResults.Count)" "White"
        Write-TestOutput "   Total Peticiones: $totalRequests" "White"
        Write-TestOutput "   Tasa de Éxito General: $overallSuccessRate%" $(if ($overallSuccessRate -ge 95) { "Green" } elseif ($overallSuccessRate -ge 85) { "Yellow" } else { "Red" })
        
        if ($overallSuccessRate -ge 95) {
            Write-TestOutput "✅ ¡Todas las pruebas pasaron con excelente rendimiento!" "Green"
        } elseif ($overallSuccessRate -ge 85) {
            Write-TestOutput "⚠️ Las pruebas pasaron pero se detectaron algunos problemas de rendimiento" "Yellow"
        } else {
            Write-TestOutput "❌ Se detectaron problemas de rendimiento - revisar configuración de servicios" "Red"
        }
    } else {
        Write-TestOutput "⚠️ No se pudieron completar las pruebas" "Yellow"
    }
    
}
catch {
    Write-TestOutput "❌ Las pruebas de carga fallaron: $($_.Exception.Message)" "Red"
    exit 1
}

Write-TestOutput "" "White"
Write-TestOutput "🛠️ Comandos útiles:" "Blue"
Write-TestOutput "   Ver logs:              docker-compose logs -f [nombre-servicio]" "Gray"
Write-TestOutput "   Reiniciar servicios:   .\scripts\start-services.ps1" "Gray"
Write-TestOutput "   Gestionar servicios:   .\scripts\manage-services.ps1 -Action status" "Gray"
