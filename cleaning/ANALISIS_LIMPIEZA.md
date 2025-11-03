# 📋 Análisis de Limpieza - Carpeta `cleaning`

## 🎯 Objetivo
Determinar qué archivos pueden eliminarse permanentemente y qué debe mantenerse para referencia histórica.

---

## ✅ **Pueden ELIMINARSE completamente**

### 📁 Archivos JSON temporales en raíz de `cleaning/`
- ❌ `feature1.json` hasta `feature6.json` - Archivos temporales de prueba
- ❌ `test_encoding.json` - Archivo de prueba de encoding

### 📁 Carpeta `cleaning/src/` - COMPLETA
- ❌ `src/` - Carpeta duplicada vacía de `frontend/src/`, no es necesaria
  - `src/index.js` - Archivo de prueba vacío
  - `src/styles/main.css` - Archivo vacío
  - Todas las subcarpetas vacías (`components/`, `hooks/`, `pages/`, `services/`, `utils/`)

### 📁 Carpeta `cleaning/scripts/` - COMPLETA
**Todos estos scripts son temporales y ya cumplieron su función:**
- ❌ `create-all-features.ps1` - Script temporal de creación
- ❌ `create-feature-json.ps1` - Script temporal
- ❌ `create-features-direct.ps1` - Script temporal
- ❌ `create-features-simple.ps1` - Script temporal
- ❌ `create-features.ps1` - Script temporal
- ❌ `recreate-features-correct.ps1` - Script temporal
- ❌ `recreate-features-final-working.ps1` - Script temporal
- ❌ `recreate-features-from-json.ps1` - Script temporal
- ❌ `recreate-features-utf8.ps1` - Script temporal
- ❌ `fix-features-encoding-final.ps1` - Script temporal
- ❌ `fix-features-encoding.ps1` - Script temporal
- ❌ `report-duplicates-fix.ps1` - Script temporal
- ❌ `report-features-session.ps1` - Script temporal
- ❌ `verify-features-simple.ps1` - Script temporal
- ❌ `verify-features.ps1` - Script temporal
- ❌ `scripts/features-data.json` - Archivo JSON temporal
- ❌ `scripts/features-duplicates-fix.json` - Archivo JSON temporal
- ❌ Carpeta `scripts/features/` completa:
  - `feature-nlp-geocoding.json`
  - `feature-pwa.json`
  - `feature-scraping.json`
  - `feature-scripts.json`
  - `feature-twitter-api.json`

### 📁 Carpeta `cleaning/bat/` - Todos los scripts .bat
**Todos son versiones antiguas o temporales del script restart-server:**
- ❌ `restart-server FIXED.bat` - Versión antigua
- ❌ `restart-server-Fixed-Seguimiento_Movilidad-ARREGLADO.bat` - Versión antigua
- ❌ `restart-server-Seguimiento_Movilidad.bat` - Versión antigua
- ❌ `restart-server.bat` - Versión antigua (ya hay uno funcional en la raíz)
- ❌ `temp_backend_Seguimiento_Movilidad.bat` - Script temporal

---

## ⚠️ **DEBEN MOVERSE a `cleaning/scripts/` antes de eliminar**

### 📁 Archivos en la **RAÍZ del proyecto** que deberían estar en `cleaning/`:
- 🔄 `fix-all-features-dates.ps1` - Script temporal ya ejecutado
- 🔄 `fix-features-dates.ps1` - Script temporal ya ejecutado
- 🔄 `report-features.ps1` - Script temporal ya ejecutado
- 🔄 `update-missing-dates.ps1` - Script temporal ya ejecutado
- 🔄 `existing-features.json` - Archivo JSON temporal de verificación
- 🔄 `features-json.json` - Archivo JSON temporal (ya se usó para reportar features)

---

## 📚 **MANTENER para referencia histórica**

### 📁 `cleaning/README.md`
- ✅ **MANTENER** - Documenta el contenido de la carpeta de limpieza

### 📁 `cleaning/docs/` (si existe)
- ✅ **MANTENER** si contiene documentación de problemas resueltos que puedan servir de referencia futura
- ⚠️ **REVISAR** cada documento para ver si aún tiene valor histórico

---

## 📊 Resumen

### Archivos a ELIMINAR: ~40+ archivos
- 6 archivos JSON temporales
- 1 carpeta `src/` completa (duplicada)
- 14 scripts PowerShell en `scripts/`
- 2 archivos JSON en `scripts/`
- 5 archivos JSON en `scripts/features/`
- 5 scripts .bat en `bat/`

### Archivos a MOVER a `cleaning/`: 6 archivos en la raíz
- 4 scripts PowerShell temporales
- 2 archivos JSON temporales

### Archivos a MANTENER: 1-2 archivos
- `cleaning/README.md`
- `cleaning/docs/` (si existe)

---

## 🎬 Plan de Acción Recomendado

1. **Mover** archivos temporales de la raíz a `cleaning/scripts/`
2. **Eliminar** completamente la carpeta `cleaning/src/`
3. **Eliminar** completamente la carpeta `cleaning/scripts/` (todos son temporales)
4. **Eliminar** completamente la carpeta `cleaning/bat/` (versiones antiguas)
5. **Eliminar** archivos JSON temporales en raíz de `cleaning/`
6. **Actualizar** `cleaning/README.md` con la nueva estructura

---

*Análisis realizado: 3 de noviembre de 2025*

