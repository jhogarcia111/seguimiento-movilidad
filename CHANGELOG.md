# Changelog

Todos los cambios notables de este proyecto serán documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/),
y este proyecto adhiere a [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2025-11-02

### Agregado
- Configuración de port forwarding con Cursor para acceso público
- Detección automática de URLs públicas del backend cuando se accede desde `devtunnels.ms`
- Configuración de CORS para permitir URLs públicas de Cursor (`devtunnels.ms` y `tunnels.cursor.com`)
- Protección de rutas de búsqueda que requieren autenticación
- Guardado automático de búsquedas asociadas al perfil del usuario
- Barra sticky en el bottom con información de la aplicación y versión
- Versión visible en el header de la aplicación
- Versión visible en la página de login debajo del título
- Link a GitHub del desarrollador (@Jhogarcia111) en la barra sticky

### Cambiado
- Botón "Buscar por Sector" ahora redirige al login si el usuario no está autenticado
- Ruta `/buscar` ahora requiere autenticación para acceder
- Búsquedas ahora usan la API autenticada `/api/user/search` en lugar de la API pública
- Frontend detecta automáticamente si está en URL pública y usa la URL pública del backend
- Configuración de PWA mejorada para permitir instalación en navegadores

### Eliminado
- Label de credenciales por defecto (admin/admin123) del formulario de login
- Archivos temporales y scripts de desarrollo que ya no son necesarios (movidos a carpeta `cleaning/`)

### Corregido
- Error `toFixed is not a function` en `SearchHistory` al convertir coordenadas a números
- Manejo de coordenadas en componentes de búsqueda para evitar errores de tipo
- Overflow horizontal en dispositivos móviles que causaba scroll horizontal no deseado
- Botones y contenido cortados en móviles ajustados al ancho de la pantalla
- Fechas de creación de features en Project Tracker corregidas a octubre-noviembre 2025
- Tildes correctas en nombres y descripciones de features

### Mejorado
- Organización del proyecto: archivos temporales movidos a carpeta `cleaning/`
- Estructura del proyecto más limpia y fácil de navegar
- Documentación de limpieza en `cleaning/README.md` y `cleaning/ANALISIS_LIMPIEZA.md`

## [1.0.0] - 2025-10-31 - Versión Inicial

### Agregado
- Frontend PWA con React y Vite
- Backend API con Express y MySQL/MariaDB
- Sistema de autenticación con JWT
- Búsqueda de problemas de movilidad por sector
- Integración con Twitter API para obtener información en tiempo real
- Integración con servicios de geocodificación
- Sistema de cache para incidentes y búsquedas
- Dashboard para usuarios autenticados
- Panel de administración
- Historial de búsquedas por usuario
- Sistema de tags y fuentes de información

---

## Notas Adicionales

### Fechas Corregidas en Project Tracker
- Todas las features ahora tienen fechas de creación correctas basadas en las fechas reales de los archivos del proyecto (octubre-noviembre 2025)
- Eliminadas todas las fechas "No definida" en el Project Tracker
- Corregidas todas las fechas incorrectas que mostraban enero 2025

### Organización del Proyecto
- Carpeta `cleaning/` creada para almacenar archivos temporales, guías resueltas y scripts que ya no son necesarios
- Estructura del proyecto optimizada con solo archivos esenciales en la raíz
- Documentación de limpieza disponible en `cleaning/ANALISIS_LIMPIEZA.md`

---

[1.1.0]: https://github.com/Jhogarcia111/seguimiento-movilidad/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/Jhogarcia111/seguimiento-movilidad/releases/tag/v1.0.0

