# Changelog

Todos los cambios notables de este proyecto serán documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/),
y este proyecto adhiere a [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2025-11-03

### Agregado
- Sistema de cache general de problemas de movilidad en Bogotá
- Tabla `general_mobility_cache` en la base de datos para almacenar resultados generales
- Endpoint `/api/mobility/general` para obtener problemas generales de movilidad
- Problemas generales de movilidad en la página principal (HomePage) con máximo 12 incidentes más relevantes
- Filtrado inteligente de tweets para mostrar solo incidentes relevantes (excluye respuestas simples, consultas, etc.)
- Sistema de priorización de incidentes basado en tipo, ubicación, fuente y recencia
- Integración completa de videos de "Transito - Tito" (mascota de la aplicación)
- Componente `TitoModal` con videos aleatorios y mensajes personalizados
- Hook `useTitoModal` para gestionar modals de Tito con mensajes de movilidad
- Modal de bienvenida con videos aleatorios de Tito saludando
- Modal de búsqueda con videos aleatorios de Tito buscando
- Video de Tito en el hero section de HomePage (lado derecho)
- Layout dividido en SectorSearch: video de Tito (izquierda) y buscador (derecha)
- Video de "camino libre" de Tito cuando no hay problemas de movilidad reportados
- Controles de video con sonido habilitado por defecto y botón mute siempre visible
- Función `getAllRecentTweets()` para obtener todos los tweets sin filtrar por sector
- Función `getGeneralMobilityProblems()` para obtener problemas generales de movilidad

### Cambiado
- Los modals ahora actúan como pre-mensajes de bienvenida: el botón X ejecuta la misma acción que el botón de confirmar
- Filtrado de incidentes mejorado: solo muestra los 12 más importantes y relevantes
- Clasificación de incidentes mejorada para excluir tweets no relevantes (respuestas, consultas, etc.)
- Sistema de priorización de incidentes: manifestación > accidente > desvío > obra
- Videos de Tito se reproducen con sonido habilitado por defecto (con fallback si el navegador lo bloquea)
- Botón mute/unmute siempre visible en la esquina superior izquierda de todos los videos

### Mejorado
- Experiencia de usuario más dinámica e interactiva con videos de Tito
- Filtrado de contenido más inteligente para mostrar solo información relevante
- Visualización de problemas generales más clara y organizada
- Interfaz más atractiva con la mascota Transito - Tito

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

[1.2.0]: https://github.com/Jhogarcia111/seguimiento-movilidad/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/Jhogarcia111/seguimiento-movilidad/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/Jhogarcia111/seguimiento-movilidad/releases/tag/v1.0.0

