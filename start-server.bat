@echo off
chcp 65001 >nul
echo ========================================
echo 🚀 Iniciando Servidores de Movilidad
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

:: Verificar que package.json existe en ambos directorios
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

:: Verificar que node_modules existe
if not exist "%BACKEND_DIR%\node_modules" (
    echo ⚠️  node_modules no encontrado en backend
    echo 📦 Instalando dependencias del backend...
    cd %BACKEND_DIR%
    call npm install
    cd ..
    echo.
)

if not exist "%FRONTEND_DIR%\node_modules" (
    echo ⚠️  node_modules no encontrado en frontend
    echo 📦 Instalando dependencias del frontend...
    cd %FRONTEND_DIR%
    call npm install
    cd ..
    echo.
)

echo ========================================
echo 🚀 Iniciando Servidores
echo ========================================
echo.

:: Iniciar Backend en nueva ventana
echo 📡 Iniciando Backend...
start "Backend - Seguimiento Movilidad" /D "%CD%\%BACKEND_DIR%" cmd /k "echo 🚀 Backend en puerto %BACKEND_PORT% && npm run dev"

:: Esperar un poco para que el backend inicie
timeout /t 3 /nobreak >nul

:: Iniciar Frontend en nueva ventana
echo 🎨 Iniciando Frontend...
start "Frontend - Seguimiento Movilidad" /D "%CD%\%FRONTEND_DIR%" cmd /k "echo 🚀 Frontend en puerto %FRONTEND_PORT% && npm run dev"

echo.
echo ========================================
echo ✅ Servidores Iniciados
echo ========================================
echo.
echo 📊 Backend:  http://localhost:%BACKEND_PORT%
echo 🎨 Frontend: http://localhost:%FRONTEND_PORT%
echo.
echo 💡 Dos ventanas se abrieron con los servidores corriendo
echo 💡 Para detener los servidores, ejecuta stop-server.bat
echo.
pause
