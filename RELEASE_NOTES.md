# 🚀 Release v1.2.0 - Notas de Lanzamiento

**Fecha**: 3 de noviembre de 2025  
**Versión**: 1.2.0  
**Autor**: Jho Garcia (@Jhogarcia111)

---

## 📋 Resumen Ejecutivo

Esta versión introduce la integración completa de la mascota "Transito - Tito" con videos interactivos, mejora significativamente la experiencia de usuario con contenido dinámico, y agrega un sistema inteligente de cache y filtrado de problemas de movilidad. La aplicación ahora es más atractiva, interactiva y fácil de usar.

---

## ✨ Nuevas Características

### 🎬 Integración de Transito - Tito
- **Videos de Tito** en toda la aplicación para una experiencia más dinámica
- **Modal de bienvenida** con videos aleatorios de Tito saludando
- **Modal de búsqueda** con videos aleatorios de Tito buscando
- **Video en hero section** de HomePage al lado derecho del título
- **Layout dividido** en SectorSearch: video de Tito (izquierda) y buscador (derecha)
- **Video "camino libre"** cuando no hay problemas de movilidad reportados
- **Componente TitoModal** reutilizable con videos y mensajes aleatorios
- **Hook useTitoModal** para gestionar modals con mensajes de movilidad

### 📊 Sistema de Cache General de Movilidad
- **Tabla `general_mobility_cache`** en la base de datos para almacenar resultados generales
- **Endpoint `/api/mobility/general`** para obtener problemas generales de movilidad
- **Cache compartida** entre todos los usuarios
- **Actualización automática** cada 30 minutos cuando un usuario accede
- **Problemas generales** en HomePage mostrando máximo 12 incidentes más relevantes

### 🎯 Filtrado Inteligente de Incidentes
- **Filtrado de tweets** para excluir respuestas simples, consultas y mensajes no relevantes
- **Sistema de priorización** de incidentes:
  - Manifestación (prioridad: 10)
  - Accidente (prioridad: 9)
  - Desvío (prioridad: 8)
  - Obra (prioridad: 7)
- **Puntuación de relevancia** basada en tipo, ubicación, fuente y recencia
- **Límite de 12 incidentes** más importantes para HomePage

### 🔊 Controles de Video Mejorados
- **Sonido habilitado por defecto** en todos los videos de Tito
- **Botón mute/unmute** siempre visible en la esquina superior izquierda
- **Fallback automático** si el navegador bloquea el audio
- **Controles responsive** adaptados a diferentes tamaños de pantalla

---

## 🔄 Cambios

### Comportamiento de Modals
- **Modals como pre-mensajes**: el botón X ejecuta la misma acción que el botón de confirmar
- **Navegación automática**: los modals siempre llevan al usuario al lugar correspondiente
- **Videos aleatorios**: cada vez que se abre un modal, se muestra un video diferente
- **Mensajes aleatorios**: cada modal muestra un mensaje diferente relacionado con movilidad

### Filtrado de Contenido
- **Solo incidentes relevantes**: se excluyen tweets que no alertan sobre problemas
- **Priorización inteligente**: los incidentes más importantes aparecen primero
- **Límite de resultados**: máximo 12 incidentes en HomePage para mejor legibilidad

### Experiencia de Usuario
- **Videos integrados**: contenido visual más atractivo en toda la aplicación
- **Layout dividido**: mejor uso del espacio en pantallas grandes
- **Feedback visual**: videos de Tito proporcionan contexto y guía al usuario

---

## 📈 Mejoras

### Interfaz de Usuario
- **Experiencia más dinámica** con videos de Tito en puntos clave
- **Visualización más clara** de problemas generales de movilidad
- **Interfaz más atractiva** con la mascota Transito - Tito
- **Mejor organización** del contenido en pantallas grandes

### Rendimiento
- **Cache eficiente** para reducir llamadas a APIs externas
- **Filtrado optimizado** para mostrar solo contenido relevante
- **Carga rápida** de videos con fallback automático

---

## 📊 Estadísticas

### Nuevas Funcionalidades
- **Componentes nuevos**: 3 (TitoModal, useTitoModal, videos de Tito)
- **Videos de Tito**: 10 videos disponibles
- **Tipos de modals**: 4 (welcome, searching, clear, notifications)
- **Mensajes personalizados**: 12+ mensajes relacionados con movilidad

### Backend
- **Nueva tabla**: `general_mobility_cache`
- **Nuevo endpoint**: `/api/mobility/general`
- **Nuevas funciones**: `getAllRecentTweets()`, `getGeneralMobilityProblems()`
- **Sistema de priorización**: Implementado

### Frontend
- **Videos integrados**: 4 ubicaciones (hero, modals, SectorSearch, no-results)
- **Controles de video**: Sonido habilitado por defecto, mute siempre visible
- **Layouts mejorados**: Hero dividido, SectorSearch dividido

---

## 🔗 Enlaces Útiles

- [Changelog Completo](./CHANGELOG.md)
- [Guía de Integración con Cursor](./docs/GUIA_CURSOR_SEGUIMIENTO_MOVILIDAD.md)
- [Project Tracker](http://localhost:3005)

---

## 📝 Notas Técnicas

### Videos de Tito
- **Ubicación**: `frontend/public/videos/`
- **Formatos**: MP4 (H.264)
- **Total**: 10 videos disponibles
- **Categorías**: saludando (3), buscando (3), camino libre (3), notificaciones (1)

### Cache General
- **Duración**: 30 minutos antes de actualizar
- **Expiración**: 1 hora
- **Límite de resultados**: 12 incidentes más relevantes
- **Actualización**: Automática cuando un usuario accede y han pasado más de 30 minutos

### Filtrado de Incidentes
- **Criterios de exclusión**: Saludos, preguntas, respuestas de servicio
- **Criterios de inclusión**: Alertas, cierres, bloqueos, accidentes, obras, desvíos
- **Priorización**: Basada en tipo, ubicación, fuente y recencia

---

**Próximos Pasos**: Subir a GitHub con tag v1.2.0
