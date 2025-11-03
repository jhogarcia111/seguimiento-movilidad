@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion
echo ========================================
echo    Seguimiento Movilidad - Server Restart
echo ========================================
echo.

REM Configuración de puertos
set BACKEND_PORT=3051
set FRONTEND_PORT=4051

REM Rutas del proyecto
set BACKEND_DIR=backend
set FRONTEND_DIR=frontend

echo 📍 Puertos configurados:
echo    Backend:  %BACKEND_PORT%
echo    Frontend: %FRONTEND_PORT%
echo.

echo [1/5] Deteniendo procesos en puertos del proyecto...
echo.

echo ========================================
echo 🔧 Backend (Puerto %BACKEND_PORT%)
echo ========================================
call :kill_port %BACKEND_PORT%
if errorlevel 1 (
    echo ERROR: Problema verificando puerto %BACKEND_PORT%
)

timeout /t 1 /nobreak >nul


echo.
echo ========================================
echo 🎨 Frontend (Puerto %FRONTEND_PORT%)
echo ========================================
call :kill_port %FRONTEND_PORT%
if errorlevel 1 (
    echo ERROR: Problema verificando puerto %FRONTEND_PORT%
)

echo.
echo Continuando con el proceso...



echo.
echo [2/5] Esperando a que los puertos se liberen...
timeout /t 2 /nobreak >nul

echo.
echo [3/5] Verificando estructura del proyecto...

REM Verificar que el directorio backend existe
if not exist "%BACKEND_DIR%" (
    echo ❌ Error: Directorio backend no encontrado
    pause
    exit /b 1
)

REM Verificar que package.json existe en backend
if not exist "%BACKEND_DIR%\package.json" (
    echo ❌ Error: package.json no encontrado en backend
    pause
    exit /b 1
)


REM Verificar que el directorio frontend existe
if not exist "%FRONTEND_DIR%" (
    echo ❌ Error: Directorio frontend no encontrado
    pause
    exit /b 1
)

REM Verificar que package.json existe en frontend
if not exist "%FRONTEND_DIR%\package.json" (
    echo ❌ Error: package.json no encontrado en frontend
    pause
    exit /b 1
)


echo ✅ Estructura del proyecto verificada

echo.
echo [4/5] Iniciando servidores del proyecto...
echo.

:: Iniciar Backend en nueva ventana
echo 📡 Iniciando Backend...
set BACKEND_BAT=%TEMP%\start_backend_%RANDOM%.bat
set BACKEND_PATH=%CD%\%BACKEND_DIR%
(
    echo @echo off
    echo chcp 65001 ^>nul
    echo cd /d "%BACKEND_PATH%"
    echo echo.
    echo echo ========================================
    echo echo 🔧 Backend - Puerto %BACKEND_PORT%
    echo echo ========================================
    echo echo.
    echo npm run dev
    echo pause
) > "%BACKEND_BAT%"
start "Backend - Seguimiento Movilidad" cmd /k "%BACKEND_BAT%"

:: Esperar un poco para que el backend inicie
timeout /t 3 /nobreak >nul


:: Iniciar Frontend en nueva ventana
echo 🎨 Iniciando Frontend...
set FRONTEND_BAT=%TEMP%\start_frontend_%RANDOM%.bat
set FRONTEND_PATH=%CD%\%FRONTEND_DIR%
(
    echo @echo off
    echo chcp 65001 ^>nul
    echo cd /d "%FRONTEND_PATH%"
    echo echo.
    echo echo ========================================
    echo echo 🎨 Frontend - Puerto %FRONTEND_PORT%
    echo echo ========================================
    echo echo.
    echo npm run dev
    echo pause
) > "%FRONTEND_BAT%"
start "Frontend - Seguimiento Movilidad" cmd /k "%FRONTEND_BAT%"


echo.
echo [5/5] ✅ Servidores iniciados
echo.

echo ========================================
echo    ¡Servidores iniciados exitosamente!
echo ========================================
echo.
echo Proyecto: Seguimiento Movilidad
echo 📊 Backend:  http://localhost:%BACKEND_PORT%
echo 🎨 Frontend: http://localhost:%FRONTEND_PORT%
echo.
echo 💡 Dos ventanas se abrieron con los servidores corriendo
echo 💡 Para detener los servidores, ejecuta stop-server.bat o cierra las ventanas

echo.
echo Presiona cualquier tecla para cerrar esta ventana...
pause >nul
endlocal
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