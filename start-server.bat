@echo off
chcp 65001 >nul
echo ========================================
echo Iniciando Transito Tito (Next.js)
echo ========================================
echo.

set APP_PORT=4051

if not exist "package.json" (
    echo Error: package.json no encontrado en la raiz
    pause
    exit /b 1
)

if not exist "node_modules" (
    echo node_modules no encontrado. Instalando dependencias...
    call npm install
    echo.
)

echo Iniciando aplicacion Next.js en puerto %APP_PORT%...
start "Transito Tito - Next.js" cmd /k "echo Next.js dev en puerto %APP_PORT% && npm run dev"

echo.
echo ========================================
echo Servidor iniciado
echo ========================================
echo.
echo App:  http://localhost:%APP_PORT%
echo API:  http://localhost:%APP_PORT%/api/*
echo.
echo Para detener el servidor ejecuta stop-server.bat
echo.
pause
