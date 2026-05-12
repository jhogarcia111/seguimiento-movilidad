@echo off
chcp 65001 >nul
echo ========================================
echo Deteniendo Transito Tito (Next.js)
echo ========================================
echo.

set APP_PORT=4051

setlocal enabledelayedexpansion
set FOUND=0
echo Buscando proceso en puerto %APP_PORT%...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :%APP_PORT%') do (
    set PID=%%a
    if !PID! neq 0 (
        set FOUND=1
        echo Proceso encontrado: PID !PID!
        taskkill /PID !PID! /F >nul 2>&1
        if !errorlevel! equ 0 (
            echo Proceso cerrado exitosamente
        ) else (
            echo No se pudo cerrar el proceso
        )
    )
)

if !FOUND! equ 0 (
    echo No hay procesos en puerto %APP_PORT%
)

taskkill /FI "WINDOWTITLE eq Transito Tito - Next.js*" /F >nul 2>&1

echo.
echo ========================================
echo Servidor detenido
echo ========================================
pause
