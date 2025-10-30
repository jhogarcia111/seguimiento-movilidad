# Seguimiento Movilidad

Un proyecto que revisa distintas cuentas de movilidad en Bogotá y responde a la pregunta sobre dónde se están presentando bloqueos o inconvenientes en la ciudad que afectan la movilidad

## 🤖 Integración con Project Tracker

Este proyecto está integrado al **Project Tracker**, un sistema de gestión de proyectos con piloto automático.

### 📋 Información del Proyecto
- **ID**: 51
- **Tipo**: web
- **Estado**: Activo
- **Integrado**: 30/10/2025

### 🚀 Para Desarrolladores

**IMPORTANTE**: Antes de comenzar a trabajar en este proyecto, lee la guía de integración:

📖 **[GUIA_CURSOR_SEGUIMIENTO_MOVILIDAD.md](docs/GUIA_CURSOR_SEGUIMIENTO_MOVILIDAD.md)**

Esta guía te permitirá:
- ✅ Conectar Cursor al Project Tracker
- ✅ Documentar todos los cambios como features
- ✅ Seguir el flujo de trabajo establecido
- ✅ Mantener trazabilidad completa del desarrollo

### 🔧 Configuración Rápida

1. **Verificar conexión al Project Tracker**:
   ```bash
   curl http://localhost:3003/api/project-tracker/projects/51
   ```

2. **Ver features del proyecto**:
   ```bash
   curl http://localhost:3003/api/project-tracker/features/51
   ```

3. **Dashboard del proyecto**:
   - URL: http://localhost:3000
   - Navegación: Proyectos → Seguimiento Movilidad

### 📊 Flujo de Trabajo

```
pendiente → en_desarrollo → en_pruebas → aprobado
```

**Reglas importantes**:
- ✅ SIEMPRE crear features con estado "pendiente" inicialmente
- ✅ NUNCA crear con estado "en_pruebas" desde el inicio
- ✅ Cambiar a "en_pruebas" solo cuando esté 100% implementado

### 🎯 Casos de Uso

#### Crear Nueva Feature
```javascript
const featureData = {
  projectId: 51,
  featureName: "Descripción del cambio",
  description: "Detalles del problema/solución",
  status: "pendiente",
  priority: "alta"
};

fetch('http://localhost:3003/api/project-tracker/features', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(featureData)
});
```

#### Cambiar Estado
```javascript
fetch(`http://localhost:3003/api/project-tracker/features/${featureId}/status`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ status: "en_desarrollo" })
});
```

### 🚨 Troubleshooting

- **Error ECONNREFUSED**: Verificar que el servidor Project Tracker esté corriendo en puerto 3003
- **Error Project not found**: Verificar que el proyecto ID 51 existe
- **Error Feature not created**: Verificar que todos los campos requeridos estén presentes

---

**Desarrollado con Project Tracker v2.0**  
**Última actualización**: 30/10/2025
