# Script para crear features pendientes en Project Tracker
# Proyecto: Seguimiento Movilidad (ID: 51)
# Backend: http://localhost:3005

$projectTrackerUrl = "http://localhost:3005/api/project-tracker/features"
$projectId = 51

# Leer features desde archivo JSON externo con encoding UTF-8
$jsonFile = "features-to-create.json"

Write-Host "Creando features en Project Tracker..." -ForegroundColor Cyan
Write-Host "Proyecto ID: $projectId" -ForegroundColor Cyan
Write-Host "URL: $projectTrackerUrl" -ForegroundColor Cyan
Write-Host ""

# Leer JSON con encoding UTF-8 explícito
$jsonContent = [System.IO.File]::ReadAllText($jsonFile, [System.Text.Encoding]::UTF8)
$features = $jsonContent | ConvertFrom-Json

$successCount = 0
$errorCount = 0

foreach ($feature in $features) {
    try {
        $body = @{
            projectId = $projectId
            featureName = $feature.featureName
            description = $feature.description
            status = $feature.status
            priority = $feature.priority
            category = $feature.category
            assignedTo = "Sistema"
            isImprovement = $true
            isError = $false
            createdAt = $feature.createdAt
        } | ConvertTo-Json -Depth 3
        
        $tempFile = "temp_feature_$(Get-Date -Format 'yyyyMMddHHmmss').json"
        $body | Out-File -FilePath $tempFile -Encoding UTF8
        
        $response = Invoke-WebRequest -Uri $projectTrackerUrl -Method POST `
            -Headers @{"Content-Type"="application/json; charset=utf-8"} `
            -InFile $tempFile
        
        $result = $response.Content | ConvertFrom-Json
        Write-Host "[OK] Feature creada: $($feature.featureName) (ID: $($result.idFeature))" -ForegroundColor Green
        $successCount++
        
        Remove-Item $tempFile -Force
        Start-Sleep -Milliseconds 500  # Pequeña pausa entre requests
    } catch {
        Write-Host "[ERROR] Error creando feature: $($feature.featureName)" -ForegroundColor Red
        Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
        $errorCount++
        if (Test-Path $tempFile) { Remove-Item $tempFile -Force }
    }
}

Write-Host ""
Write-Host "Resumen:" -ForegroundColor Cyan
Write-Host "   Exitosas: $successCount" -ForegroundColor Green
Write-Host "   Errores: $errorCount" -ForegroundColor Red
Write-Host "   Total: $($features.Count)" -ForegroundColor Cyan

