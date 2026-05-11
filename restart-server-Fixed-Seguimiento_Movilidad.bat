@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion
echo ========================================
echo 🔄 Reiniciando Servidores de Seguimiento Movilidad
echo ========================================
echo.

:: Configuración de puertos
set BACKEND_PORT=3051
set FRONTEND_PORT=4051

:: Rutas del proyecto
set BACKEND_DIR=backend
set FRONTEND_DIR=frontend

echo 📍 Puertos configurados:
echo    Backend:  %BACKEND_PORT%
echo    Frontend: %FRONTEND_PORT%
echo.

:: Cerrar procesos del backend
echo.
echo ========================================
echo 🔧 Backend (Puerto %BACKEND_PORT%)
echo ========================================
call :kill_port %BACKEND_PORT%

:: Esperar un momento para que los puertos se liberen
timeout /t 2 /nobreak >nul

:: Cerrar procesos del frontend
echo.
echo ========================================
echo 🎨 Frontend (Puerto %FRONTEND_PORT%)
echo ========================================
call :kill_port %FRONTEND_PORT%

:: Esperar un momento más
timeout /t 2 /nobreak >nul

:: Verificar que los directorios existen
if not exist "%BACKEND_DIR%" (
    echo ❌ Error: Directorio backend no encontrado
    pause
    exit /b 1
)

if not exist "%FRONTEND_DIR%" (
    echo ❌ Error: Directorio frontend no encontrado
    pause
    exit /b 1
)

:: Verificar que package.json existe en backend
if not exist "%BACKEND_DIR%\package.json" (
    echo ❌ Error: package.json no encontrado en backend
    pause
    exit /b 1
)

if not exist "%FRONTEND_DIR%\package.json" (
    echo ❌ Error: package.json no encontrado en frontend
    pause
    exit /b 1
)

echo.
echo ========================================
echo 🚀 Iniciando Servidores
echo ========================================
echo.

:: Iniciar Backend y Frontend en Windows Terminal con paneles divididos
echo 📡 Iniciando Backend y Frontend en Windows Terminal...
set BACKEND_BAT_WT=%TEMP%\start_backend_wt_%RANDOM%.bat
set FRONTEND_BAT_WT=%TEMP%\start_frontend_wt_%RANDOM%.bat

set BACKEND_PATH=%CD%\%BACKEND_DIR%
(
echo @echo off
echo chcp 65001 ^>nul
echo cd /d "%BACKEND_PATH%"
echo title "Seguimiento Movilidad - Backend"
echo set TZ=America/Bogota
echo set PORT=%BACKEND_PORT%
echo echo.
echo echo ========================================
echo echo 🔧 Backend - Puerto %BACKEND_PORT%
echo echo ========================================
echo echo.
echo start /b cmd /c "for /l %%%%i in (1,0,2) do @title "Seguimiento Movilidad - Backend" ^& timeout /t 2 /nobreak ^>nul"
echo call npm.cmd run dev
echo pause
) > "%BACKEND_BAT_WT%"

set FRONTEND_PATH=%CD%\%FRONTEND_DIR%
(
echo @echo off
echo chcp 65001 ^>nul
echo cd /d "%FRONTEND_PATH%"
echo title "Seguimiento Movilidad - Frontend"
echo set TZ=America/Bogota
echo set PORT=%FRONTEND_PORT%
echo set VITE_PORT=%FRONTEND_PORT%
echo echo.
echo echo ========================================
echo echo 🎨 Frontend - Puerto %FRONTEND_PORT%
echo echo ========================================
echo echo.
echo start /b cmd /c "for /l %%%%i in (1,0,2) do @title "Seguimiento Movilidad - Frontend" ^& timeout /t 2 /nobreak ^>nul"
echo call npm.cmd run dev
echo pause
) > "%FRONTEND_BAT_WT%"

start "" wt.exe new-tab --title "Seguimiento Movilidad - Backend" cmd /k "%BACKEND_BAT_WT%" ; new-tab --title "Seguimiento Movilidad - Frontend" cmd /k "%FRONTEND_BAT_WT%"
echo.
echo 🌐 Esperando servidores...
timeout /t 5 /nobreak >nul
echo 🌐 Abriendo navegador...
:: Obtener IP local (física de la red)
set LOCAL_IP=
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do (
    set IP_LINE=%%a
    set IP_LINE=!IP_LINE:~1!
    :: Verificar que sea una IP privada (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
    echo !IP_LINE! | findstr /r "^192.168." >nul
    if !errorlevel! equ 0 (
        set LOCAL_IP=!IP_LINE!
        goto :found_ip
    )
    echo !IP_LINE! | findstr /r "^10." >nul
    if !errorlevel! equ 0 (
        set LOCAL_IP=!IP_LINE!
        goto :found_ip
    )
    echo !IP_LINE! | findstr /r "^172.1[6-9]." >nul
    if !errorlevel! equ 0 (
        set LOCAL_IP=!IP_LINE!
        goto :found_ip
    )
    echo !IP_LINE! | findstr /r "^172.2[0-9]." >nul
    if !errorlevel! equ 0 (
        set LOCAL_IP=!IP_LINE!
        goto :found_ip
    )
    echo !IP_LINE! | findstr /r "^172.3[0-1]." >nul
    if !errorlevel! equ 0 (
        set LOCAL_IP=!IP_LINE!
        goto :found_ip
    )
)
:found_ip
if not defined LOCAL_IP set LOCAL_IP=localhost
start "" "http://%LOCAL_IP%:%FRONTEND_PORT%"

echo.
echo ========================================
echo ✅ Servidores Reiniciados
echo ========================================
echo.
echo 📊 Backend:  http://localhost:%BACKEND_PORT%
echo 🎨 Frontend: http://localhost:%FRONTEND_PORT%
echo.
echo 💡 Dos ventanas se abrirán con los servidores corriendo
echo 💡 Cierra esta ventana cuando quieras detener los servidores
echo.
pause
goto :end

:: Función para encontrar y cerrar proceso en un puerto (sin bucles infinitos)
:kill_port
setlocal enabledelayedexpansion
set PORT=%1
set FOUND=0
echo 🔍 Buscando procesos en puerto %PORT%...

:: Verificar primero si hay procesos
netstat -ano 2>nul | findstr /C:":%PORT%" | findstr "LISTENING" >nul 2>&1
if errorlevel 1 (
    echo ✅ No hay procesos en puerto %PORT%
    endlocal
    exit /b 0
)

:: Buscar procesos usando el puerto - solo procesar el primero y salir
:: Usar método simple: obtener solo la primera línea
set TMP_OUT=%TEMP%\port_%PORT%_%RANDOM%.txt
netstat -ano 2>nul | findstr /C:":%PORT%" | findstr "LISTENING" > "%TMP_OUT%" 2>nul

if exist "%TMP_OUT%" (
    set /p FIRST_LINE=<"%TMP_OUT%" 2>nul
    if defined FIRST_LINE (
        REM Extraer PID (último campo)
        for %%p in (%FIRST_LINE%) do set PID=%%p
        if defined PID (
            if not "!PID!"=="" if not "!PID!"=="0" (
                set FOUND=1
                echo ⚠️  Proceso encontrado: PID !PID!
                echo 🛑 Cerrando proceso...
                taskkill /PID !PID! /F >nul 2>&1
                if !errorlevel! equ 0 (
                    echo ✅ Proceso cerrado exitosamente
                ) else (
                    echo ⚠️  No se pudo cerrar el proceso (puede que ya no exista)
                )
            )
        )
    )
    del "%TMP_OUT%" >nul 2>&1
)

if !FOUND! equ 0 (
    echo ✅ No hay procesos en puerto %PORT%
)
endlocal
exit /b 0

:end
