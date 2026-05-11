# Script para actualizar fechas de creación de features en Project Tracker
# Actualizar todas las features creadas hoy a 2025-11-04

$projectTrackerUrl = "http://localhost:3005/api/project-tracker"
$projectId = 51

# Obtener todas las features del proyecto
Write-Host "Obteniendo features del proyecto..." -ForegroundColor Cyan
$response = Invoke-WebRequest -Uri "$projectTrackerUrl/features?projectId=$projectId" -Method GET
$allFeatures = $response.Content | ConvertFrom-Json

# Filtrar features del proyecto 51 que fueron creadas hoy (03-Nov o sin fecha)
$featuresToUpdate = $allFeatures | Where-Object { 
    $_.projectId -eq 51 -and (
        $_.createdAt -eq $null -or 
        $_.createdAt -like "*2025-11-03*" -or
        $_.createdAt -like "*2025-11-04*"
    )
}

Write-Host "Features a actualizar: $($featuresToUpdate.Count)" -ForegroundColor Yellow
Write-Host ""

# Lista de features que fueron trabajadas HOY (04-Nov-2025)
# Estas son todas las features que acabamos de crear
$updatedDate = "2025-11-04T10:00:00.000Z"  # Fecha base para hoy

$successCount = 0
$errorCount = 0

foreach ($feature in $featuresToUpdate) {
    try {
        # Usar endpoint PUT para actualizar la fecha de creación
        $updateUrl = "$projectTrackerUrl/features/$($feature.idFeature)/created-date"
        
        # Calcular hora aproximada basada en el orden de creación
        # Las features más tempranas tienen horas más tempranas
        $hourOffset = $successCount * 0.5  # Incrementar 30 minutos por feature
        $updateDate = (Get-Date "2025-11-04T10:00:00Z").AddHours($hourOffset).ToUniversalTime().ToString("s") + "Z"
        
        $body = @{
            createdAt = $updateDate
        } | ConvertTo-Json -Depth 3
        
        $tempFile = "temp_update_date_$(Get-Date -Format 'yyyyMMddHHmmss').json"
        $body | Out-File -FilePath $tempFile -Encoding UTF8
        
        $updateResponse = Invoke-WebRequest -Uri $updateUrl -Method PUT `
            -Headers @{"Content-Type"="application/json; charset=utf-8"} `
            -InFile $tempFile
        
        Write-Host "[OK] Feature $($feature.idFeature): $($feature.featureName)" -ForegroundColor Green
        Write-Host "     Fecha actualizada a: $updateDate" -ForegroundColor Gray
        $successCount++
        
        Remove-Item $tempFile -Force
        Start-Sleep -Milliseconds 300  # Pequeña pausa entre requests
    } catch {
        Write-Host "[ERROR] Feature $($feature.idFeature): $($feature.featureName)" -ForegroundColor Red
        Write-Host "     Error: $($_.Exception.Message)" -ForegroundColor Red
        $errorCount++
        if (Test-Path $tempFile) { Remove-Item $tempFile -Force }
    }
}

Write-Host ""
Write-Host "Resumen:" -ForegroundColor Cyan
Write-Host "   Exitosas: $successCount" -ForegroundColor Green
Write-Host "   Errores: $errorCount" -ForegroundColor Red
Write-Host "   Total: $($featuresToUpdate.Count)" -ForegroundColor Cyan

