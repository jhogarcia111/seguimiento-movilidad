# 🚀 Release v1.1.0 - Notas de Lanzamiento

**Fecha**: 2 de noviembre de 2025  
**Versión**: 1.1.0  
**Autor**: Jho Garcia (@Jhogarcia111)

---

## 📋 Resumen Ejecutivo

Esta versión incluye mejoras significativas en la experiencia de usuario, funcionalidad PWA, organización del proyecto y correcciones importantes. Todas las features han sido correctamente documentadas en el Project Tracker con fechas reales de creación.

---

## ✨ Nuevas Características

### 🔌 Acceso Público y Port Forwarding
- Configuración de port forwarding con Cursor para acceso público
- Detección automática de URLs públicas del backend cuando se accede desde `devtunnels.ms`
- Configuración de CORS para permitir URLs públicas de Cursor (`devtunnels.ms` y `tunnels.cursor.com`)

### 🔐 Seguridad y Autenticación
- Protección de rutas de búsqueda que requieren autenticación
- Guardado automático de búsquedas asociadas al perfil del usuario
- Ruta `/buscar` ahora requiere autenticación para acceder

### 🎨 Mejoras de UI/UX
- Barra sticky en el bottom con información de la aplicación y versión
- Versión visible en el header de la aplicación
- Versión visible en la página de login debajo del título
- Link a GitHub del desarrollador (@Jhogarcia111) en la barra sticky

---

## 🔄 Cambios

### Comportamiento de Búsqueda
- Botón "Buscar por Sector" ahora redirige al login si el usuario no está autenticado
- Búsquedas ahora usan la API autenticada `/api/user/search` en lugar de la API pública
- Frontend detecta automáticamente si está en URL pública y usa la URL pública del backend

### PWA
- Configuración de PWA mejorada para permitir instalación en navegadores
- Iconos PWA actualizados y configurados correctamente
- Service Worker configurado correctamente para instalación

---

## 🗑️ Eliminado

### Seguridad
- Label de credenciales por defecto (admin/admin123) del formulario de login

### Organización
- Archivos temporales y scripts de desarrollo que ya no son necesarios (movidos a carpeta `cleaning/`)

---

## 🐛 Correcciones

### Bugs Críticos
- **Error `toFixed is not a function`** en `SearchHistory` al convertir coordenadas a números
- Manejo de coordenadas en componentes de búsqueda para evitar errores de tipo

### Responsive Design
- **Overflow horizontal en dispositivos móviles** que causaba scroll horizontal no deseado
- Botones y contenido cortados en móviles ajustados al ancho de la pantalla
- Contenido ahora se ajusta correctamente en todos los tamaños de pantalla

### Project Tracker
- **Fechas de creación de features** corregidas a octubre-noviembre 2025 (basadas en fechas reales de archivos)
- Eliminadas todas las fechas "No definida" en el Project Tracker
- Corregidas todas las fechas incorrectas que mostraban enero 2025
- **Tildes correctas** en nombres y descripciones de features

---

## 📈 Mejoras

### Organización del Proyecto
- Carpeta `cleaning/` creada para almacenar archivos temporales, guías resueltas y scripts innecesarios
- Estructura del proyecto optimizada con solo archivos esenciales en la raíz
- Documentación de limpieza disponible en `cleaning/ANALISIS_LIMPIEZA.md` y `cleaning/README.md`

---

## 📊 Estadísticas

### Features Reportadas en Project Tracker
- **Total de features**: 42
- **Features con fecha correcta**: 42 (100%)
- **Features sin fecha**: 0
- **Features con fecha incorrecta**: 0

### Organización
- **Archivos eliminados**: ~40+ archivos temporales
- **Carpetas organizadas**: 4 carpetas (docs, bat, ps1, scripts)
- **Documentación**: CHANGELOG.md actualizado completamente

---

## 🔗 Enlaces Útiles

- [Changelog Completo](./CHANGELOG.md)
- [Análisis de Limpieza](./cleaning/ANALISIS_LIMPIEZA.md)
- [Guía de Integración con Cursor](./docs/GUIA_CURSOR_SEGUIMIENTO_MOVILIDAD.md)
- [Project Tracker](http://localhost:3005)

---

## 📝 Notas Técnicas

### Fechas de Features
Todas las features ahora tienen fechas de creación correctas basadas en las fechas reales de los archivos del proyecto:
- **Features v1.0.0**: 31 de octubre de 2025
- **Features v1.1.0**: 2 de noviembre de 2025

### Proyecto
El proyecto está completamente organizado con:
- Solo archivos esenciales en la raíz
- Archivos temporales en `cleaning/`
- Documentación completa y actualizada
- PWA completamente funcional e instalable

---

**Próximos Pasos**: Subir a GitHub con tag v1.1.0

