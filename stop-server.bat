@echo off
chcp 65001 >nul
echo ========================================
echo 🛑 Deteniendo Servidores de Movilidad
echo ========================================
echo.

:: Configuración de puertos
set BACKEND_PORT=3051
set FRONTEND_PORT=4051

echo 📍 Cerrando procesos en puertos:
echo    Backend:  %BACKEND_PORT%
echo    Frontend: %FRONTEND_PORT%
echo.

:: Función para encontrar y cerrar proceso en un puerto
setlocal enabledelayedexpansion
:kill_port
set PORT=%1
echo 🔍 Buscando procesos en puerto %PORT%...

:: Buscar procesos usando el puerto
set FOUND=0
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :%PORT%') do (
    set PID=%%a
    if !PID! neq 0 (
        set FOUND=1
        echo ⚠️  Proceso encontrado: PID !PID!
        echo 🛑 Cerrando proceso...
        taskkill /PID !PID! /F >nul 2>&1
        if !errorlevel! equ 0 (
            echo ✅ Proceso cerrado exitosamente
        ) else (
            echo ⚠️  No se pudo cerrar el proceso
        )
    )
)

if !FOUND! equ 0 (
    echo ✅ No hay procesos en puerto %PORT%
)

goto :eof

:: Cerrar procesos del backend
echo ========================================
echo 🔧 Backend (Puerto %BACKEND_PORT%)
echo ========================================
call :kill_port %BACKEND_PORT%

:: Esperar un momento
timeout /t 1 /nobreak >nul

:: Cerrar procesos del frontend
echo.
echo ========================================
echo 🎨 Frontend (Puerto %FRONTEND_PORT%)
echo ========================================
call :kill_port %FRONTEND_PORT%

:: También cerrar ventanas de Node.js relacionadas (opcional)
echo.
echo 🔍 Buscando procesos de Node.js...
taskkill /FI "WINDOWTITLE eq Backend - Seguimiento Movilidad*" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq Frontend - Seguimiento Movilidad*" /F >nul 2>&1

echo.
echo ========================================
echo ✅ Servidores Detenidos
echo ========================================
echo.
pause
