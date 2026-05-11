# Seguimiento Movilidad

## 📋 Descripción
Un proyecto que revisa distintas cuentas de movilidad en Bogotá y responde a la pregunta sobre dónde se están presentando bloqueos o inconvenientes en la ciudad que afectan la movilidad

## 🎯 Información del Proyecto
- **ID en Project Tracker**: 51
- **Tipo**: web
- **Estado**: Activo

## 🌐 Puertos Asignados
- **Backend**: http://localhost:3051
- **Frontend**: http://localhost:4051

## 🗄️ Base de Datos
- **Nombre**: `seguimiento_movilidad`
- **Tipo**: MySQL
- **Puerto**: 3306
- **Host**: localhost
- **Cadena de Conexión**: `mysql://root@localhost:3306/seguimiento_movilidad`


## 🚀 Inicio Rápido

### 1. Verificar Conexión al Project Tracker
```bash
curl http://localhost:3000/api/project-tracker/projects/51
```

### 2. Instalar Dependencias
```bash
npm install
```

### 3. Iniciar Desarrollo
```bash
# Backend
npm run dev

# Frontend (en otra terminal)
cd frontend && npm run dev
```

## 📚 Documentación
- [Guía de Integración con Cursor](./docs/GUIA_CURSOR_SEGUIMIENTO_MOVILIDAD.md)
- [Guía de Debug Móvil](./docs/GUIA_DEBUG_MOVIL.md)
- [Project Tracker](http://localhost:3000)

## 🔧 Comandos Útiles

### Crear Feature
```bash
curl -X POST http://localhost:3000/api/project-tracker/features \
  -H "Content-Type: application/json" \
  -d '{"projectId": 51, "featureName": "Nueva Feature", "description": "Descripción", "status": "pendiente"}'
```

### Ver Features del Proyecto
```bash
curl http://localhost:3000/api/project-tracker/features?projectId=51
```

---
*Generado automáticamente por Project Tracker*

