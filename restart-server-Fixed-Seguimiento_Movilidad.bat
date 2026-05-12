@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion
echo ========================================
echo Reiniciando Transito Tito (Next.js)
echo ========================================
echo.

set APP_PORT=4051

echo Cerrando procesos en puerto %APP_PORT%...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :%APP_PORT%') do (
    set PID=%%a
    if !PID! neq 0 (
        echo Cerrando PID !PID!...
        taskkill /PID !PID! /F >nul 2>&1
    )
)

timeout /t 2 /nobreak >nul

if not exist "package.json" (
    echo Error: package.json no encontrado en la raiz
    pause
    exit /b 1
)

if not exist "node_modules" (
    echo node_modules no encontrado. Instalando dependencias...
    call npm install
)

echo.
echo Iniciando Next.js en puerto %APP_PORT%...
start "" wt.exe new-tab --title "Transito Tito - Next.js" cmd /k "npm run dev"

timeout /t 5 /nobreak >nul
echo Abriendo navegador...
start "" "http://localhost:%APP_PORT%"

echo.
echo ========================================
echo Servidor reiniciado
echo ========================================
echo.
echo App: http://localhost:%APP_PORT%
echo.
pause
