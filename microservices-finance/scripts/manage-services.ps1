# 🔧 MANAGE SERVICES - POWERSHELL COMPATIBLE
# Script para gestionar servicios individuales usando PowerShell

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("start", "stop", "restart", "logs", "status", "scale", "build")]
    [string]$Action,
    
    [Parameter(Mandatory=$false)]
    [string]$Service = "all",
    
    [Parameter(Mandatory=$false)]
    [int]$Scale = 1
)

Write-Host "🔧 =====================================" -ForegroundColor Cyan
Write-Host "   MICROSERVICES MANAGER" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan

# Available services
$availableServices = @(
    "redis",
    "mongodb", 
    "legacy-backend",
    "api-gateway",
    "processing-service-1",
    "processing-service-2", 
    "notification-service",
    "nginx-lb",
    "prometheus",
    "grafana"
)

# Navigate to project directory
$projectPath = "c:\Projects\microservices-finance"
if (Test-Path $projectPath) {
    Set-Location $projectPath
    Write-Host "📁 Working in: $projectPath" -ForegroundColor Blue
} else {
    Write-Host "❌ Project directory not found: $projectPath" -ForegroundColor Red
    exit 1
}

# Function to execute Docker Compose commands safely
function Invoke-DockerCompose {
    param(
        [string]$Command,
        [string]$Description
    )
    
    Write-Host "🔄 $Description..." -ForegroundColor Blue
    
    try {
        $fullCommand = "docker-compose $Command"
        Write-Host "   Executing: $fullCommand" -ForegroundColor Gray
        
        $result = Invoke-Expression $fullCommand
        
        if ($LASTEXITCODE -eq 0 -or $null -eq $LASTEXITCODE) {
            Write-Host "✅ $Description completed successfully" -ForegroundColor Green
            return $true
        } else {
            Write-Host "❌ $Description failed with exit code: $LASTEXITCODE" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "❌ $Description failed: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Validate service name
if ($Service -ne "all" -and $Service -notin $availableServices) {
    Write-Host "❌ Invalid service name: $Service" -ForegroundColor Red
    Write-Host "Available services: $($availableServices -join ', ')" -ForegroundColor Yellow
    exit 1
}

# Execute action
switch ($Action) {
    "start" {
        if ($Service -eq "all") {
            Write-Host "🚀 Starting all services..." -ForegroundColor Green
            
            # Start in order: databases, backend, microservices, gateway, load balancer, monitoring
            $startOrder = @(
                @("redis mongodb", "Starting databases"),
                @("legacy-backend", "Starting legacy backend"), 
                @("processing-service-1 processing-service-2 notification-service", "Starting microservices"),
                @("api-gateway", "Starting API Gateway"),
                @("nginx-lb", "Starting Load Balancer"),
                @("prometheus grafana", "Starting monitoring services")
            )
            
            foreach ($step in $startOrder) {
                $success = Invoke-DockerCompose "up -d $($step[0])" $step[1]
                if (-not $success) {
                    Write-Host "⚠️ Continuing despite failure..." -ForegroundColor Yellow
                }
                Start-Sleep -Seconds 5
            }
        } else {
            Invoke-DockerCompose "up -d $Service" "Starting $Service"
        }
    }
    
    "stop" {
        if ($Service -eq "all") {
            Invoke-DockerCompose "down" "Stopping all services"
        } else {
            Invoke-DockerCompose "stop $Service" "Stopping $Service"
        }
    }
    
    "restart" {
        if ($Service -eq "all") {
            Write-Host "🔄 Restarting all services..." -ForegroundColor Yellow
            Invoke-DockerCompose "restart" "Restarting all services"
        } else {
            Invoke-DockerCompose "restart $Service" "Restarting $Service"
        }
    }
    
    "logs" {
        if ($Service -eq "all") {
            Write-Host "📋 Showing logs for all services (Ctrl+C to exit)..." -ForegroundColor Blue
            docker-compose logs -f
        } else {
            Write-Host "📋 Showing logs for $Service (Ctrl+C to exit)..." -ForegroundColor Blue
            docker-compose logs -f $Service
        }
    }
    
    "status" {
        Write-Host "📊 Service Status:" -ForegroundColor Blue
        Write-Host ""
        
        # Get container status
        try {
            $containers = docker-compose ps --format table
            Write-Host $containers
        } catch {
            Write-Host "❌ Failed to get container status" -ForegroundColor Red
        }
        
        Write-Host ""
        Write-Host "🔍 Health Checks:" -ForegroundColor Blue
        
        $healthChecks = @(
            @{ Name = "Legacy Backend"; Url = "http://localhost:3000/health" },
            @{ Name = "API Gateway"; Url = "http://localhost:8080/health" },
            @{ Name = "Processing Service 1"; Url = "http://localhost:8081/health" },
            @{ Name = "Processing Service 2"; Url = "http://localhost:8083/health" },
            @{ Name = "Notification Service"; Url = "http://localhost:8082/health" },
            @{ Name = "Load Balancer"; Url = "http://localhost:80/health" }
        )
        
        foreach ($check in $healthChecks) {
            try {
                $response = Invoke-WebRequest -Uri $check.Url -Method GET -TimeoutSec 3 -UseBasicParsing -ErrorAction SilentlyContinue
                if ($response.StatusCode -eq 200) {
                    Write-Host "   ✅ $($check.Name)" -ForegroundColor Green
                } else {
                    Write-Host "   ⚠️ $($check.Name) (Status: $($response.StatusCode))" -ForegroundColor Yellow
                }
            } catch {
                Write-Host "   ❌ $($check.Name)" -ForegroundColor Red
            }
        }
    }
    
    "scale" {
        if ($Service -eq "all") {
            Write-Host "❌ Cannot scale all services. Please specify a service." -ForegroundColor Red
            exit 1
        }
        
        if ($Scale -lt 1 -or $Scale -gt 10) {
            Write-Host "❌ Scale must be between 1 and 10" -ForegroundColor Red
            exit 1
        }
        
        Invoke-DockerCompose "up -d --scale $Service=$Scale $Service" "Scaling $Service to $Scale instances"
    }
    
    "build" {
        if ($Service -eq "all") {
            Invoke-DockerCompose "build --no-cache" "Building all services"
        } else {
            Invoke-DockerCompose "build --no-cache $Service" "Building $Service"
        }
    }
}

Write-Host ""
Write-Host "📋 Quick Commands:" -ForegroundColor Blue
Write-Host "   .\manage-services.ps1 start api-gateway" -ForegroundColor Gray
Write-Host "   .\manage-services.ps1 logs notification-service" -ForegroundColor Gray
Write-Host "   .\manage-services.ps1 scale processing-service-1 -Scale 3" -ForegroundColor Gray
Write-Host "   .\manage-services.ps1 status" -ForegroundColor Gray

Write-Host ""
Write-Host "✨ Operation completed!" -ForegroundColor Green
