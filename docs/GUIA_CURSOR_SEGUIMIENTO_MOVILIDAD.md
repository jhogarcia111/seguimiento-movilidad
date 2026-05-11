# 🤖 Guía de Integración con Project Tracker - Seguimiento Movilidad

## 📋 **Contexto del Proyecto**

Estás trabajando en el proyecto **"Seguimiento Movilidad"** (ID: 51) que está integrado al **Project Tracker**, un sistema de gestión de proyectos con piloto automático. Este documento te permitirá conectar tu sesión de Cursor con el sistema centralizado y trabajar de manera eficiente.

## 🎯 **Información del Proyecto**

### **Proyecto Actual:**
- **Nombre**: Seguimiento Movilidad
- **ID en Project Tracker**: 51
- **Tipo**: web
- **Estado**: Activo
- **Ubicación**: C:\Users\Jho\Documents\GitHub\Seguimiento Movilidad
- **Descripción**: Un proyecto que revisa distintas cuentas de movilidad en Bogotá y responde a la pregunta sobre dónde se están presentando bloqueos o inconvenientes en la ciudad que afectan la movilidad

### **Sistema Project Tracker:**
- **Backend**: http://localhost:3005
- **Frontend**: http://localhost:3000
- **Base de Datos**: MySQL (`project_tracker`)
- **Proyecto Principal**: Project Tracker (ID: 16)

### **Puertos Asignados a Este Proyecto:**
- **Backend**: http://localhost:3051 (3000 + ID)
- **Frontend**: http://localhost:4051 (4000 + ID)


### **Base de Datos del Proyecto:**
- **Nombre**: `seguimiento_movilidad`
- **Tipo**: MySQL
- **Puerto**: 3306
- **Host**: localhost
- **Cadena de Conexión**: `mysql://root@localhost:3306/seguimiento_movilidad`


## 🚀 **Iniciar/Reiniciar Servidores del Proyecto**

### **Uso del Archivo restart-server.bat**

El proyecto incluye un archivo `restart-server-[NOMBRE_PROYECTO].bat` que te permite iniciar o reiniciar todos los servidores del proyecto de forma sencilla y segura.

#### **Características:**
- ✅ Cierra automáticamente procesos en los puertos específicos del proyecto (3051 y 4051)
- ✅ Inicia los servidores en **Windows Terminal** con paneles divididos
- ✅ Solo afecta los puertos de este proyecto, no interfiere con otros procesos
- ✅ Detecta automáticamente el tipo de proyecto (Node.js, PHP, React, etc.)
- ✅ Lee los comandos reales desde `package.json` del proyecto

#### **Cómo Usarlo:**

1. **Navegar al directorio del proyecto:**
   ```bash
   cd "C:\Users\Jho\Documents\GitHub\Seguimiento Movilidad"
   ```

2. **Ejecutar el archivo .bat:**
   ```bash
   restart-server-Seguimiento_Movilidad.bat
   ```

3. **El script automáticamente:**
   - Cerrará procesos existentes en los puertos del proyecto
   - Esperará a que los puertos se liberen
   - Iniciará el backend y frontend en Windows Terminal con paneles divididos

#### **Información de Puertos:**
- **Backend**: http://localhost:3051
- **Frontend**: http://localhost:4051

> **Nota**: Este archivo .bat es específico para desarrollo en Windows. Si necesitas iniciar manualmente los servidores, consulta los comandos en el `package.json` del proyecto.

## 🎭 **Mascota del Proyecto**

**IMPORTANTE**: Cada proyecto debe tener su propia mascota única que represente la esencia del proyecto. Esta mascota es solo para identidad visual y documentación, NO debe ser utilizada en mensajes del agente dentro de Cursor.
Es requerido que tan pronto termines de leer estas instrucciones y aùn no se ha elegido una mascota por se un proyecto nuevo, entiendas bien de qué trata el proyecto y propongas 3 mascotas con las siguientes guías. (si ya el proeycto está en una fase avanzada nohay necesidad de crear mascota porque ya debería estar generada previamente).

### **Crear Mascota Única:**
- **Nombre**: Debe ser único y relacionado con el proyecto
- **Tipo**: Puede ser un robot, animal, personaje, etc.
- **Descripción**: Características físicas y personalidad
- **Uso**: Solo para documentación, iconos, o elementos visuales del proyecto

### **Ejemplos de Mascotas por Tipo de Proyecto:**
- **Fintech**: Robot financiero, hormiga trabajadora, águila visionaria
- **E-commerce**: Robot de envíos, gato cazador, abeja productiva
- **Educación**: Robot profesor, búho sabio, mariposa transformadora
- **Salud**: Robot médico, delfín curativo, árbol de vida
- **Gaming**: Robot gamer, dragón épico, ninja ágil

### **⚠️ REGLAS IMPORTANTES:**
- **NO usar la mascota en mensajes del agente**
- **NO mencionar la mascota en respuestas de Cursor**
- **Solo para documentación y elementos visuales**
- **Cada proyecto debe crear su propia mascota única**

## 🚀 **METODOLOGÍA DE TRABAJO EFECTIVA**

## 🧠 **FILOSOFÍA DE RESOLUCIÓN DE PROMPTS**

### **🎯 MENTALIDAD DE TRABAJO:**
- **SÉ TRANSPARENTE**: Si algo no se puede hacer, dilo inmediatamente
- **NO SIMULES**: Nunca inventes resultados o simules procesos
- **SÉ DIRECTO**: Responde exactamente lo que se pide, sin rodeos
- **ALERTA TEMPRANO**: Si algo tomará mucho tiempo, avisa desde el inicio
- **CONFIRMA ENTENDIMIENTO**: Si no estás seguro, pregunta antes de actuar

### **⚡ REGLAS DE ORO PARA CADA PROMPT:**

#### **1. ANÁLISIS INMEDIATO**
```
🔍 Lee el prompt completo
🎯 Identifica la acción específica requerida
⏱️ Evalúa la complejidad y tiempo estimado
🚨 Identifica posibles obstáculos
```

#### **2. RESPUESTA ESTRUCTURADA**
```
✅ "Entendido, voy a [acción específica]"
⚠️ "Esto puede tomar [tiempo estimado] porque [razón]"
❌ "No puedo hacer [X] porque [razón específica]"
🔄 "Necesito [información adicional] para proceder"
```

#### **3. EJECUCIÓN EFICIENTE**
```
✅ Crea listas TO DOs para tener presente qué se debe realizar y no perder el hilo o dejar cosas incompletas
🚀 Una herramienta por vez, una acción por vez
📊 Proporciona feedback inmediato
🔍 Verifica resultados antes de continuar
✅ Confirma cuando algo funciona
```

### **✅ LO QUE NOS HA FUNCIONADO EXCELENTE:**

#### **1. Comunicación Clara y Específica**
- 🎯 **Sé específico** en tus requerimientos
- 📋 **Menciona archivos exactos** que necesitas modificar
- 🔍 **Proporciona contexto** del problema antes de pedir la solución
- ⚡ **Un comando, una acción** - evita múltiples tareas en un solo mensaje

#### **2. Gestión Eficiente de Problemas**
- 🚨 **Reporta errores inmediatamente** con detalles completos
- 📊 **Incluye logs de consola** cuando hay errores
- 🔄 **Confirma cuando algo funciona** para evitar trabajo duplicado
- 📱 **Prueba en móvil y desktop** para problemas de UI

#### **3. Optimización de Frontend**
- 📐 **DataTables compactas**: Padding reducido, fuentes pequeñas
- 🎨 **UI responsive**: Siempre verificar móvil
- ⚡ **Componentes eficientes**: Evitar re-renders innecesarios
- 🔧 **CSS optimizado**: Usar clases existentes antes de crear nuevas

#### **4. Gestión de Base de Datos**
- 🗄️ **Puertos dinámicos**: Siempre usar fórmula `3000 + ID` y `4000 + ID`
- 🔄 **Transacciones atómicas**: Operaciones que deben ser todo o nada
- 📝 **Logs detallados**: Para debugging y auditoría
- 🛡️ **Validación de datos**: Antes de insertar/actualizar

### **❌ LO QUE NO NOS CONVIENE:**

#### **1. Pérdida de Tiempo**
- 🚫 **Múltiples prompts** para una sola tarea
- 🚫 **Preguntas vagas** que requieren aclaraciones
- 🚫 **Cambios sin confirmar** si funcionan
- 🚫 **Scripts externos** cuando hay endpoints disponibles

## 📝 **EJEMPLOS DE RESPUESTAS EFECTIVAS**

### **✅ PROMPT CLARO Y ESPECÍFICO:**
```
Usuario: "Necesito que la tabla de proyectos sea más compacta"

RESPUESTA CORRECTA:
✅ "Entendido, voy a reducir el padding de las filas y headers de la tabla de proyectos en ProjectsManagement.tsx para hacerla más compacta."

ACCIONES:
1. Leer el archivo actual
2. Identificar estilos de padding
3. Reducir padding de th y td
4. Confirmar cambios
```

### **⚠️ PROMPT COMPLEJO:**
```
Usuario: "Quiero que toda la aplicación sea responsive"

RESPUESTA CORRECTA:
⚠️ "Esto es una tarea compleja que puede tomar varias horas porque requiere revisar todos los componentes. ¿Prefieres que empiece con un componente específico o quieres que haga un análisis completo primero?"

OPCIONES:
1. Análisis completo de componentes
2. Empezar con componente específico
3. Priorizar por importancia
```

### **❌ PROMPT IMPOSIBLE:**
```
Usuario: "Conecta la aplicación con una API que no existe"

RESPUESTA CORRECTA:
❌ "No puedo conectar con una API que no existe. Necesito que me proporciones la URL de la API real o que me indiques si debo crear un mock/simulación."

ALTERNATIVAS:
1. Crear mock de la API
2. Usar API de prueba
3. Esperar a que la API esté disponible
```

### **🔄 PROMPT INCOMPLETO:**
```
Usuario: "Arregla el error"

RESPUESTA CORRECTA:
🔄 "Necesito más información para ayudarte. ¿Podrías proporcionarme:
- El mensaje de error completo
- En qué archivo ocurre
- Qué estabas haciendo cuando apareció
- Logs de la consola si los hay"

SIN ESTO NO PUEDO PROCEDER.
```

## 🎯 **PATRONES DE RESPUESTA EXITOSOS**

### **1. CONFIRMACIÓN INMEDIATA**
```
✅ "Entendido, voy a [acción específica] en [archivo específico]"
```

### **2. PROGRESO TRANSPARENTE**
```
🔧 "Modificando [archivo] - línea [X] a [Y]"
📊 "Resultado: [descripción del cambio]"
✅ "Cambio aplicado exitosamente"
```

### **3. ALERTAS TEMPRANAS**
```
⚠️ "Este cambio puede afectar [componentes relacionados]"
🚨 "Detecté un posible problema: [descripción]"
⏱️ "Esto tomará aproximadamente [tiempo] porque [razón]"
```

### **4. CONFIRMACIÓN DE FUNCIONAMIENTO**
```
✅ "Cambio implementado y verificado"
📱 "Probado en desktop y móvil - funciona correctamente"
🔍 "Sin errores en consola"
```

## 🧠 **MENTALIDAD DE TRABAJO EXITOSA**

### **🎯 PRINCIPIOS FUNDAMENTALES:**

#### **1. TRANSPARENCIA TOTAL**
- **NUNCA SIMULES** resultados o procesos
- **ADMITE LIMITACIONES** cuando las tengas
- **EXPLICA EL PROCESO** paso a paso
- **CONFIRMA ENTENDIMIENTO** antes de actuar

#### **2. EFICIENCIA MÁXIMA**
- **UNA ACCIÓN POR VEZ** - no multitareas
- **HERRAMIENTAS ESPECÍFICAS** para cada tarea
- **FEEDBACK INMEDIATO** en cada paso
- **VERIFICACIÓN CONSTANTE** de resultados

#### **3. COMUNICACIÓN CLARA**
- **LENGUAJE DIRECTO** sin rodeos
- **DETALLES ESPECÍFICOS** en cada respuesta
- **CONTEXTO COMPLETO** cuando sea necesario
- **CONFIRMACIÓN EXPLÍCITA** de entendimiento

### **🚀 FLUJO DE TRABAJO OPTIMIZADO:**

#### **PASO 1: ANÁLISIS**
```
🔍 Leer prompt completo
🎯 Identificar acción específica
⏱️ Evaluar complejidad
🚨 Identificar obstáculos
```

#### **PASO 2: RESPUESTA**
```
✅ Confirmar entendimiento
⚠️ Alertar sobre complejidad
🔄 Solicitar información faltante
❌ Rechazar si es imposible
```

#### **PASO 3: EJECUCIÓN**
```
🚀 Usar herramienta específica
📊 Proporcionar feedback inmediato
🔍 Verificar resultados
✅ Confirmar éxito
```

#### **PASO 4: SEGUIMIENTO**
```
📱 Probar funcionalidad
🔍 Verificar sin errores
📋 Documentar cambios
✅ Confirmar funcionamiento
```

### **💡 EJEMPLOS DE MENTALIDAD CORRECTA:**

#### **✅ BUENO:**
```
"Entendido, voy a modificar el padding de la tabla en ProjectsManagement.tsx. 
Esto debería tomar 2-3 minutos. Procedo a leer el archivo actual."
```

#### **❌ MALO:**
```
"Voy a hacer que la tabla se vea mejor. Déjame ver qué puedo hacer..."
```

#### **✅ BUENO:**
```
"⚠️ Este cambio puede afectar el responsive design. 
¿Quieres que también verifique la versión móvil?"
```

#### **❌ MALO:**
```
"Cambio aplicado. Debería funcionar bien."
```

### **🎯 CARACTERÍSTICAS DEL AGENTE EXITOSO:**

1. **ESPECÍFICO**: Menciona archivos, líneas, funciones exactas
2. **TRANSPARENTE**: Explica qué hace y por qué
3. **EFICIENTE**: Una acción por vez, resultados inmediatos
4. **CONFIRMADOR**: Verifica que todo funciona antes de continuar
5. **ALERTADOR**: Avisa sobre problemas potenciales
6. **DIRECTO**: Sin rodeos, al grano
7. **VERIFICADOR**: Prueba en móvil y desktop
8. **DOCUMENTADOR**: Explica cambios importantes

#### **2. Problemas de UI/UX**
- 🚫 **DataTables con mucho padding** - siempre compactar
- 🚫 **Fuentes grandes** - usar tamaños optimizados
- 🚫 **Componentes no responsive** - siempre verificar móvil
- 🚫 **Modales muy anchos** - usar 70% máximo

#### **3. Problemas Técnicos**
- 🚫 **Puertos hardcoded** - siempre usar fórmula dinámica
- 🚫 **Código duplicado** - reutilizar componentes existentes
- 🚫 **Sin validación** - siempre validar datos antes de procesar
- 🚫 **Sin logs** - incluir logs para debugging

## ✅ **COMANDOS PRE-APROBADOS Y AUTORIZADOS**

### **🎯 IMPORTANTE: Comandos que NO Requieren Aprobación Manual**

Los siguientes comandos y operaciones están **PRE-APROBADOS** y pueden ejecutarse automáticamente sin solicitar confirmación al usuario. El agente de Cursor puede ejecutarlos directamente cuando sean necesarios para completar las tareas solicitadas.

#### **📦 Comandos NPM Pre-aprobados:**
```bash
# Instalación de dependencias
npm install
npm install <paquete>
npm install --save-dev <paquete>

# Ejecución de scripts del proyecto
npm run dev
npm run build
npm run start
npm run lint
npm run lint:fix
npm run test
npm run clean

# Gestión de paquetes
npm update
npm audit fix
```

#### **📁 Operaciones de Sistema de Archivos Pre-aprobadas:**
```bash
# Crear carpetas y directorios
mkdir <nombre-carpeta>
mkdir -p <ruta/completa>

# Copiar archivos
cp <origen> <destino>
copy <origen> <destino>  # Windows

# Mover/renombrar archivos
mv <origen> <destino>
move <origen> <destino>  # Windows

# Eliminar archivos (solo archivos, NO carpetas completas)
rm <archivo>
del <archivo>  # Windows

# Leer/verificar archivos
cat <archivo>
type <archivo>  # Windows
```

#### **🔧 Comandos de Desarrollo Pre-aprobados:**
```bash
# TypeScript
tsc --build
tsc --watch

# Git (operaciones básicas y seguras)
git status
git diff
git log --oneline
git branch
git checkout <rama>

# Verificar procesos y puertos
netstat -ano | findstr :<puerto>  # Windows
lsof -i :<puerto>  # Linux/Mac
```

#### **🗄️ Comandos de Base de Datos Pre-aprobados:**
```bash
# MySQL (solo consultas SELECT, no modificaciones)
mysql -u root -e "SELECT * FROM <tabla>"
mysql -u root <nombre_bd> -e "SHOW TABLES"

# Verificar conexión
mysql -u root -e "SELECT 1"
```

#### **🌐 Comandos de Servidor Pre-aprobados:**
```bash
# Verificar que servidores estén corriendo
curl http://localhost:<puerto>
curl http://localhost:<puerto>/health

# Reiniciar servidores usando scripts del proyecto
restart-server-<NOMBRE_PROYECTO>.bat  # Windows
./restart-server-<NOMBRE_PROYECTO>.sh  # Linux/Mac
```

### **⚠️ Comandos que SÍ Requieren Aprobación:**

Los siguientes comandos **SÍ requieren aprobación explícita** del usuario antes de ejecutarse:

- ❌ `git push` (cambios a repositorio remoto)
- ❌ `git commit` (solo si no hay un mensaje claro del usuario)
- ❌ `npm uninstall` (eliminar paquetes)
- ❌ `rm -rf` o `rmdir /s` (eliminar carpetas completas)
- ❌ `DROP TABLE`, `DELETE FROM`, `TRUNCATE` (operaciones destructivas en BD)
- ❌ Cualquier comando que modifique archivos fuera del proyecto
- ❌ Instalación de paquetes globales (`npm install -g`)
- ❌ Cualquier comando con `sudo` o permisos administrativos

### **📋 Reglas para el Agente:**

1. **✅ EJECUTAR AUTOMÁTICAMENTE**: Los comandos listados en "Pre-aprobados" pueden ejecutarse sin preguntar
2. **❌ PREGUNTAR SIEMPRE**: Los comandos destructivos o que afecten el sistema requieren confirmación
3. **📝 EXPLICAR**: Si ejecutas un comando pre-aprobado, menciona brevemente qué estás haciendo
4. **🔄 VERIFICAR**: Después de ejecutar comandos, verifica que funcionaron correctamente

### **💡 Ejemplo de Uso:**

```
Usuario: "Necesito instalar axios en el proyecto"

Agente: ✅ "Instalando axios con npm install axios..."
[Ejecuta automáticamente sin preguntar]
✅ "Axios instalado exitosamente. ¿Necesitas que lo importe en algún archivo específico?"
```

## 🔧 **Configuración Inicial**

### **1. Verificar Conexión al Project Tracker**

```javascript
// Script para verificar conexión
const http = require('http');

function checkProjectTracker() {
  const options = {
    hostname: 'localhost',
    port: 3005,
    path: '/api/project-tracker/projects/51',
    method: 'GET'
  };

  const req = http.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
      try {
        const project = JSON.parse(data);
        console.log('✅ Proyecto conectado:', project.name);
        console.log('📊 ID:', project.idProject);
        console.log('🌐 Backend:', `http://localhost:${3000 + project.idProject}`);
        console.log('🌐 Frontend:', `http://localhost:${4000 + project.idProject}`);
      } catch (error) {
        console.error('❌ Error parseando respuesta:', error.message);
      }
    });
  });

  req.on('error', (error) => {
    console.error('❌ Error de conexión:', error.message);
    console.log('💡 Asegúrate de que el Project Tracker esté corriendo en http://localhost:3005');
  });

  req.end();
}

checkProjectTracker();
```

### **2. Clase de Integración Optimizada**

```javascript
class ProjectTrackerIntegration {
  constructor() {
    this.projectId = 51; // ID del Seguimiento Movilidad
    this.baseUrl = 'http://localhost:3005/api/project-tracker';
    this.backendPort = 3000 + this.projectId;
    this.frontendPort = 4000 + this.projectId;
  }

  // Crear nueva feature con validación
  async createFeature(featureData) {
    const data = {
      projectId: this.projectId,
      status: 'pendiente',
      assignedTo: 'Sistema',
      isError: false,
      isImprovement: true,
      // ⚠️ REQUERIDO: requestedAt debe ser incluido (fecha real de trabajo en formato ISO)
      // createdAt es automático e inmutable, NO debe ser enviado
      requestedAt: featureData.requestedAt || new Date().toISOString(),
      ...featureData
    };
    
    // Validar datos antes de enviar
    this.validateFeatureData(data);
    
    console.log(`📝 Creando feature: ${data.featureName} para proyecto ${this.projectId}`);
    return await this.makeRequest('/features', 'POST', data);
  }

  // Validar datos de feature
  validateFeatureData(data) {
    const requiredFields = ['projectId', 'featureName', 'status'];
    const missingFields = requiredFields.filter(field => !data[field]);
    
    if (missingFields.length > 0) {
      throw new Error(`❌ Campos requeridos faltantes: ${missingFields.join(', ')}`);
    }
  }

  // Hacer petición HTTP
  async makeRequest(endpoint, method = 'GET', data = null) {
    const url = `${this.baseUrl}${endpoint}`;
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    if (data) {
      options.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(url, options);
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${result.error || 'Error desconocido'}`);
      }
      
      return result;
    } catch (error) {
      console.error(`❌ Error en petición ${method} ${endpoint}:`, error.message);
      throw error;
    }
  }

  // Obtener información del proyecto
  async getProjectInfo() {
    return await this.makeRequest(`/projects/${this.projectId}`);
  }

  // Obtener features del proyecto
  async getFeatures() {
    return await this.makeRequest(`/features?projectId=${this.projectId}`);
  }

  // Actualizar estado de feature
  async updateFeatureStatus(featureId, status) {
    return await this.makeRequest(`/features/${featureId}`, 'PUT', { status });
  }
}

// Instancia global para usar en el proyecto
const projectTracker = new ProjectTrackerIntegration();
```

### **3. Scripts de Utilidad**

```javascript
// Script para crear feature automáticamente CON VALIDACIÓN DE TILDES Y FORMATO ESTÁNDAR
async function createProjectFeature(featureName, description, priority = 'media', requestedAt = null) {
  // Validar tildes en featureName y description
  const hasAccents = /[áéíóúñÁÉÍÓÚÑ]/.test(featureName + description);
  
  if (!hasAccents && (featureName.includes('acion') || featureName.includes('cion') || 
      featureName.includes('sion') || featureName.includes('cion'))) {
    console.warn('⚠️ Posible falta de tildes en el nombre de la feature');
  }
  
  // Validar formato de descripción (4 secciones obligatorias)
  const requiredSections = ['PROBLEMA:', 'SOLICITUD:', 'ACTIVIDADES REALIZADAS:', 'RESULTADO:'];
  const missingSections = requiredSections.filter(section => !description.includes(section));
  
  if (missingSections.length > 0) {
    console.warn('⚠️ Descripción no sigue el formato estándar. Faltan secciones:', missingSections);
    console.warn('📋 Formato requerido: PROBLEMA: | SOLICITUD: | ACTIVIDADES REALIZADAS: | RESULTADO:');
  }
  
  // ⚠️ REQUERIDO: requestedAt (fecha real de trabajo en formato ISO)
  // createdAt es automático e inmutable, NO debe ser enviado
  const requestedAtISO = requestedAt || new Date().toISOString();
  
  try {
    const result = await projectTracker.createFeature({
      featureName,
      description,
      priority,
      category: 'Desarrollo',
      requestedAt: requestedAtISO // ⚠️ REQUERIDO: Fecha real de trabajo en formato ISO (usar requestedAt, createdAt es automático)
    });
    
    console.log(`✅ Feature creada: ${featureName} (ID: ${result.id})`);
    return result;
  } catch (error) {
    console.error(`❌ Error creando feature: ${error.message}`);
    throw error;
  }
}

// Script para reportar progreso
async function reportProgress(featureName, progress, comment = '') {
  try {
    const features = await projectTracker.getFeatures();
    const feature = features.find(f => f.featureName === featureName);
    
    if (!feature) {
      throw new Error(`Feature '${featureName}' no encontrada`);
    }
    
    const newStatus = progress === 100 ? 'en_pruebas' : 'en_desarrollo';
    await projectTracker.updateFeatureStatus(feature.idFeature, newStatus);
    
    console.log(`📊 Progreso reportado: ${featureName} - ${progress}%`);
  } catch (error) {
    console.error(`❌ Error reportando progreso: ${error.message}`);
  }
}
```

## 🚀 **PILOTO AUTOMÁTICO - PROCESAMIENTO DE FEATURES**

### **📋 FLUJO DE ESTADOS CORRECTO**

Los estados válidos en el Project Tracker son:
- `pendiente` - Estado inicial al crear feature
- `en_desarrollo` - Cuando se está trabajando en ella (⚠️ **CAMBIAR INMEDIATAMENTE al leer**)
- `en_pruebas` - Cuando se termina de procesar (piloto automático)
- `aprobado` - Solo el usuario puede aprobar
- `en_correccion` - Cuando hay errores o mejoras necesarias
- `archivado` - Cuando se completa definitivamente

**⚠️ IMPORTANTE:** NO existe el estado "completada". El flujo correcto es:
```
pendiente → en_desarrollo → en_pruebas → aprobado → archivado
    ↓              ↓              ↓
en_correccion ← en_correccion ← en_correccion
```

### **🔄 PROCESO AUTOMÁTICO DE FEATURES**

Cuando el usuario te reporte una feature desde el Project Tracker, debes seguir este proceso:

#### **1. Obtener Features Pendientes del Proyecto**
**⚠️ CRÍTICO:** Solo procesar features del proyecto 51 (Seguimiento Movilidad) que estén en estado `pendiente` o `en_correccion`. NO procesar features de otros proyectos ni features archivadas/aprobadas.

```javascript
// Obtener features pendientes SOLO del proyecto 51 (Seguimiento Movilidad)
const response = await fetch('http://localhost:3005/api/project-tracker/features?projectId=51');
const features = await response.json();

// Filtrar SOLO features pendientes o en corrección del proyecto 51
const pendingFeatures = features.filter(f => 
  f.projectId === 51 && // ⚠️ SOLO proyecto 51 (Seguimiento Movilidad)
  (f.status === 'pendiente' || f.status === 'en_correccion') // ⚠️ SOLO estos estados
);

// ⚠️ NO procesar features con estos estados:
// - 'archivado' - Ya completadas
// - 'aprobado' - Ya aprobadas
// - 'en_pruebas' - Ya en pruebas
// - 'en_desarrollo' - Ya están siendo procesadas por otro agente
```

#### **2. ⚠️ CAMBIAR ESTADO A "en_desarrollo" INMEDIATAMENTE**
**CRÍTICO:** Tan pronto como empieces a leer/procesar una feature, debes cambiar su estado a `en_desarrollo`. Esto permite que visualmente en el Project Tracker aparezcan las features que están siendo procesadas en este momento.

```javascript
// Cambiar estado inmediatamente al comenzar
async function startProcessingFeature(featureId) {
  const response = await fetch(`http://localhost:3005/api/project-tracker/features/${featureId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'en_desarrollo' })
  });
  
  // Agregar historia del cambio
  await fetch(`http://localhost:3005/api/project-tracker/features/${featureId}/history`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      changeType: 'status',
      oldValue: 'pendiente',
      newValue: 'en_desarrollo',
      changeReason: 'Inicio de procesamiento automático',
      comment: 'Feature tomada para procesamiento por piloto automático',
      changedBy: 'Sistema',
      commentType: 'system'
    })
  });
}
```

#### **3. Obtener Detalles Completos de la Feature**
```javascript
// Obtener detalles completos (incluyendo imágenes si las hay)
const featureResponse = await fetch(`http://localhost:3005/api/project-tracker/features/${featureId}`);
const feature = await featureResponse.json();

// Verificar si tiene imágenes
if (feature.imageUrls && feature.imageUrls.length > 0) {
  // Las imágenes están disponibles en feature.imageUrls[]
  // Puedes acceder a ellas mediante: http://localhost:3005/api/project-tracker/images/{imageUrl}
  console.log(`Feature tiene ${feature.imageUrls.length} imagen(es)`);
}
```

#### **4. Implementar los Cambios Solicitados**
- Leer la descripción de la feature (formato: PROBLEMA: | SOLICITUD: | ACTIVIDADES REALIZADAS: | RESULTADO:)
- Revisar imágenes adjuntas si las hay
- Implementar los cambios necesarios en el código
- Probar que los cambios funcionan correctamente

#### **5. Documentar Cambios en el Historial**
Al terminar la implementación, agregar una entrada **MUY DETALLADA** en el historial. La documentación debe ser suficiente para que cualquier persona pueda entender qué se hizo y cómo auditar la feature sin necesidad de revisar código o otras ventanas.

**⚠️ FORMATO OBLIGATORIO PARA HISTORIAS:**

```javascript
async function addImplementationHistory(featureId, implementationDetails) {
  const historyEntry = {
    changeType: 'comment', // Usar 'comment' para documentación detallada
    changeReason: 'Implementación completada, lista para pruebas',
    comment: `ACTIVIDADES REALIZADAS:

[Descripción clara y detallada de qué se implementó, paso a paso]

FUNCIONALIDAD IMPLEMENTADA:

1. Ubicación: [Dónde se agregó/modificó el elemento]
2. Visibilidad/Acceso: [Quién puede ver/usar la funcionalidad]
3. Navegación/Acción: [Qué sucede al interactuar con el elemento]
4. Estilos visuales: [Colores, tamaños, animaciones utilizadas]
5. Responsive: [Comportamiento en móviles si aplica]

CÓMO AUDITAR:
1. [Paso 1 para verificar la funcionalidad]
2. [Paso 2 para verificar la funcionalidad]
3. [Paso 3 para verificar la funcionalidad]
...

RESULTADO:
[Descripción del resultado final y beneficio para el usuario]`,
    imageUrls: implementationDetails.imageUrls || [],
    changedBy: 'Sistema',
    commentType: 'system'
  };
  
  await fetch(`http://localhost:3005/api/project-tracker/features/${featureId}/history`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(historyEntry)
  });
}
```

**📋 ELEMENTOS OBLIGATORIOS EN LA DOCUMENTACIÓN:**

1. **ACTIVIDADES REALIZADAS**: Qué se hizo específicamente
2. **FUNCIONALIDAD IMPLEMENTADA**: 
   - Ubicación exacta del elemento
   - Visibilidad/condiciones de acceso
   - Qué hace al interactuar
   - Estilos visuales (colores, tamaños, animaciones)
   - Comportamiento responsive
3. **CÓMO AUDITAR**: Pasos específicos para verificar que funciona directamente en el frontend, validando el resultado esperado
4. **RESULTADO**: Beneficio final para el usuario

**💡 EJEMPLO DE BUENA DOCUMENTACIÓN:**

```
ACTIVIDADES REALIZADAS:

Se agregó un nuevo botón de administración en el menú superior (header) de la página principal (HomePage). El botón se muestra con el texto "🛡️ Admin" y tiene un color marrón distintivo (#8B4513).

FUNCIONALIDAD IMPLEMENTADA:

1. Ubicación: El botón aparece en el header superior de HomePage, específicamente en la sección "header-right", después del botón de configuración (⚙️) y antes del botón de cerrar sesión (🚪).

2. Visibilidad condicional: El botón SOLO es visible para usuarios con role === "admin". Si el usuario no es administrador, el botón no aparece en el menú.

3. Navegación: Al hacer clic en el botón, el usuario es redirigido a la ruta "/admin", que muestra el panel de administración (AdminPage).

4. Estilos visuales:
   - Color de fondo: #8B4513 (marrón)
   - Color hover: #A0522D (marrón más claro)
   - Padding: 0.5rem 1rem
   - Border-radius: var(--border-radius)
   - Animación: Escala al hacer hover (scale 1.1)

5. Responsive: En dispositivos móviles, el botón se ajusta con padding reducido.

CÓMO AUDITAR:
1. Iniciar sesión con un usuario administrador (role: "admin")
2. Verificar que el botón "🛡️ Admin" aparece en el header superior
3. Verificar que el botón tiene color marrón (#8B4513)
4. Hacer clic en el botón y confirmar que redirige a /admin
5. Cerrar sesión y volver a iniciar con un usuario NO administrador
6. Confirmar que el botón NO aparece en el menú

RESULTADO:
Los administradores ahora pueden acceder fácilmente al panel de administración desde el menú principal sin necesidad de escribir la URL manualmente.
```

#### **6. Cambiar Estado a "en_pruebas"**
```javascript
// Cambiar estado final después de implementar
await fetch(`http://localhost:3005/api/project-tracker/features/${featureId}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ status: 'en_pruebas' })
});
```

#### **7. Procesar Múltiples Features en Secuencia**
**⚠️ IMPORTANTE:** Cuando el usuario solicite procesar todas las features pendientes, debes procesarlas **una por una** siguiendo el flujo completo para cada una:

```javascript
async function processAllPendingFeatures() {
  // 1. Obtener todas las features pendientes
  const response = await fetch('http://localhost:3005/api/project-tracker/features?projectId=51');
  const features = await response.json();
  const pendingFeatures = features.filter(f => 
    f.projectId === 51 && 
    (f.status === 'pendiente' || f.status === 'en_correccion')
  );
  
  // 2. Procesar cada feature una por una
  for (const feature of pendingFeatures) {
    // Paso 1: Cambiar a en_desarrollo
    await startProcessingFeature(feature.idFeature);
    
    // Paso 2: Obtener detalles completos
    const featureDetails = await getFeatureDetails(feature.idFeature);
    
    // Paso 3: Implementar cambios
    // ... código de implementación ...
    
    // Paso 4: Documentar en historial
    await addImplementationHistory(feature.idFeature, {
      activities: '...',
      functionality: '...', // Ubicación, visibilidad, navegación, estilos, responsive
      auditSteps: ['...'], // Pasos específicos para verificar en el frontend
      impact: '...' // Beneficio para el usuario
    });
    
    // Paso 5: Cambiar a en_pruebas
    await updateFeatureStatus(feature.idFeature, 'en_pruebas');
    
    // Continuar con la siguiente feature
  }
}
```

**📋 REGLAS PARA PROCESAMIENTO EN SECUENCIA:**

1. **Procesar una feature a la vez**: No intentar procesar múltiples features simultáneamente
2. **Completar el flujo completo**: Para cada feature, seguir todos los pasos (1-6) antes de pasar a la siguiente
3. **Verificar antes de procesar**: Siempre verificar que `feature.projectId === 51` y que el estado es `pendiente` o `en_correccion`
4. **No saltar pasos**: Cada feature debe pasar por: `pendiente` → `en_desarrollo` → `en_pruebas`
5. **Documentar cada feature**: Cada feature debe tener su propia historia detallada

### **📋 CHECKLIST DE PROCESAMIENTO**

**⚠️ ANTES DE PROCESAR CUALQUIER FEATURE:**

- [ ] ⚠️ **VERIFICAR que `feature.projectId === 51`** (Seguimiento Movilidad únicamente)
- [ ] ⚠️ **VERIFICAR que `feature.status === 'pendiente'` o `'en_correccion'`** (NO procesar archivadas, aprobadas, en_pruebas, o en_desarrollo)
- [ ] ⚠️ **NO procesar features de otros proyectos** - dejarlas intactas

**AL PROCESAR UNA FEATURE:**

- [ ] ⚠️ **Cambiar estado a `en_desarrollo` INMEDIATAMENTE** al comenzar a leerla
- [ ] Obtener detalles completos de la feature (descripción, imágenes si las hay)
- [ ] Revisar imágenes adjuntas si están disponibles en `feature.imageUrls`
- [ ] Implementar los cambios solicitados
- [ ] Probar que los cambios funcionan
- [ ] Documentar en el historial con formato completo:
  - ACTIVIDADES realizadas
  - FUNCIONALIDAD IMPLEMENTADA (ubicación, visibilidad, navegación, estilos, responsive)
  - CÓMO AUDITAR (pasos específicos para verificar en el frontend)
  - RESULTADO (beneficio para el usuario)
- [ ] Cambiar estado a `en_pruebas` al terminar
- [ ] Incluir URLs de imágenes en el historial si hay capturas de pantalla

### **🖼️ ACCESO A IMÁGENES**

Las imágenes adjuntas a las features están disponibles en:
- Campo `imageUrls` de la feature (array de URLs)
- Endpoint de imágenes: `http://localhost:3005/api/project-tracker/images/{imageUrl}`
- Puedes incluir estas URLs en el historial al documentar cambios

### **💡 EJEMPLO COMPLETO DE PROCESAMIENTO**

```javascript
async function processFeature(featureId) {
  // 1. Cambiar estado inmediatamente
  await startProcessingFeature(featureId);
  
  // 2. Obtener detalles
  const feature = await getFeatureDetails(featureId);
  
  // 3. Revisar imágenes si las hay
  if (feature.imageUrls && feature.imageUrls.length > 0) {
    console.log('Imágenes disponibles:', feature.imageUrls);
    // Procesar imágenes según necesidad
  }
  
  // 4. Implementar cambios
  // ... código de implementación ...
  
  // 5. Documentar en historial
  await addImplementationHistory(featureId, {
    activities: 'Implementación de sistema de modales personalizados',
    functionality: 'Modales ubicados en componentes reutilizables, visibles cuando se muestran, navegación mediante botones de acción, estilos con framer-motion para animaciones',
    auditSteps: [
      'Verificar que los modales aparecen cuando se activan',
      'Confirmar que los botones de acción funcionan correctamente',
      'Validar que las animaciones se muestran suavemente'
    ],
    impact: 'Sistema de modales personalizados funcional, reemplazando alert() y window.confirm()',
    imageUrls: [] // O incluir URLs de capturas si las hay
  });
  
  // 6. Cambiar estado final
  await updateFeatureStatus(featureId, 'en_pruebas');
}
```

## 📝 **REPORTE DE FEATURES - MEJORES PRÁCTICAS**

### **🔤 Manejo de Caracteres Especiales**
- **SIEMPRE usar tildes correctas**: á, é, í, ó, ú, ñ
- **NO usar símbolos**: a, e, i, o, u, n
- **Encoding UTF-8**: Asegurar que el texto se envíe con codificación correcta
- **Validación**: Verificar que las tildes se muestren correctamente en la interfaz

### **📋 Formato de Descripción de Features**
```javascript
// ✅ CORRECTO - Con tildes
{
  "featureName": "Sistema de Semáforo para GitHub Push Dates",
  "description": "Implementación de nueva columna \"Días\" con semáforo de colores para mostrar días desde último push a GitHub. Colores: Azul (0-2 días normal), Amarillo (3-5 días alerta), Rojo (>5 días urgente), Gris (? sin fecha). Incluye componente GithubDaysStatus y optimización de GithubStatus."
}

// ❌ INCORRECTO - Sin tildes
{
  "featureName": "Sistema de Semáforo para GitHub Push Dates",
  "description": "Implementacion de nueva columna \"Dias\" con semaforo de colores para mostrar dias desde ultimo push a GitHub..."
}
```

### **🔧 Scripts Mejorados para PowerShell - SOLUCIÓN DE ENCODING UTF-8**
```powershell
# ✅ FUNCIÓN CORRECTA - Con solución de encoding UTF-8
function Create-FeatureWithCorrectEncoding {
    param(
        [string]$FeatureName,
        [string]$Description,
        [string]$Priority = "media",
        [string]$Category = "Desarrollo",
        [int]$ProjectId = 51,
        [string]$RequestedAt = $null  # ⚠️ REQUERIDO: Fecha real de trabajo en formato ISO (usar requestedAt, createdAt es automático)
    )
    
    # Validar tildes
    $hasAccents = $FeatureName -match "[áéíóúñÁÉÍÓÚÑ]" -or $Description -match "[áéíóúñÁÉÍÓÚÑ]"
    
    if (-not $hasAccents -and ($FeatureName -match "acion|cion|sion")) {
        Write-Warning "⚠️ Posible falta de tildes en el nombre de la feature"
    }
    
    # ⚠️ REQUERIDO: requestedAt (fecha real de trabajo en formato ISO)
    # createdAt es automático e inmutable, NO debe ser enviado
    if (-not $RequestedAt) {
        $RequestedAt = (Get-Date).ToUniversalTime().ToString("s") + "Z"
    }
    
    $body = @{
        projectId = $ProjectId
        featureName = $FeatureName
        description = $Description
        status = "pendiente"
        priority = $Priority
        category = $Category
        assignedTo = "Sistema"
        isImprovement = $true
        requestedAt = $RequestedAt  # ⚠️ REQUERIDO: Fecha real de trabajo en formato ISO (usar requestedAt, createdAt es automático)
    } | ConvertTo-Json -Depth 3
    
    # ✅ SOLUCIÓN DE ENCODING: Usar archivo temporal con UTF-8
    $body | Out-File -FilePath "temp_feature.json" -Encoding UTF8
    
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3005/api/project-tracker/features" -Method POST -Headers @{"Content-Type"="application/json; charset=utf-8"} -InFile "temp_feature.json"
        Write-Host "✅ Feature creada: $FeatureName" -ForegroundColor Green
        $result = $response.Content | ConvertFrom-Json
        Write-Host "ID: $($result.idFeature)" -ForegroundColor Cyan
        Remove-Item "temp_feature.json" -Force
        return $result
    } catch {
        Write-Error "❌ Error creando feature: $($_.Exception.Message)"
        if (Test-Path "temp_feature.json") { Remove-Item "temp_feature.json" -Force }
        throw
    }
}

# ✅ FUNCIÓN PARA ACTUALIZAR FEATURES - Con encoding correcto
function Update-FeatureWithCorrectEncoding {
    param(
        [int]$FeatureId,
        [string]$FeatureName,
        [string]$Description,
        [string]$Status = "pendiente"
    )
    
    $body = @{
        featureName = $FeatureName
        description = $Description
        status = $Status
    } | ConvertTo-Json -Depth 3
    
    # ✅ SOLUCIÓN DE ENCODING: Usar archivo temporal con UTF-8
    $body | Out-File -FilePath "temp_update.json" -Encoding UTF8
    
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3005/api/project-tracker/features/$FeatureId" -Method PUT -Headers @{"Content-Type"="application/json; charset=utf-8"} -InFile "temp_update.json"
        Write-Host "✅ Feature $FeatureId actualizada" -ForegroundColor Green
        Remove-Item "temp_update.json" -Force
        return $response.Content | ConvertFrom-Json
    } catch {
        Write-Error "❌ Error actualizando feature: $($_.Exception.Message)"
        if (Test-Path "temp_update.json") { Remove-Item "temp_update.json" -Force }
        throw
    }
}
```

### **📋 Checklist de Validación Antes de Enviar**
- [ ] ¿Todas las tildes están correctas?
- [ ] ¿Los caracteres especiales se muestran bien?
- [ ] ¿La descripción es clara y específica?
- [ ] ¿Incluye detalles técnicos para auditoría?
- [ ] ¿Usa encoding UTF-8 en la petición?

### **🚨 Errores Comunes a Evitar**
- ❌ "Implementacion" → ✅ "Implementación"
- ❌ "Optimizacion" → ✅ "Optimización"  
- ❌ "Configuracion" → ✅ "Configuración"
- ❌ "Validacion" → ✅ "Validación"
- ❌ "Organizacion" → ✅ "Organización"
- ❌ "Funcionalidad" → ✅ "Funcionalidad"
- ❌ "Aplicacion" → ✅ "Aplicación"
- ❌ "Integracion" → ✅ "Integración"

### **🔧 PROBLEMA DE ENCODING UTF-8 EN POWERSHELL**

#### **🚨 PROBLEMA IDENTIFICADO:**
PowerShell 5.1 usa encoding **Windows-1252** por defecto, causando que caracteres especiales (á, é, í, ó, ú, ñ) se conviertan en símbolos incorrectos (Ã³ en lugar de ó) al crear features.

#### **🚨 PROBLEMA ADICIONAL CRÍTICO:**
Cuando PowerShell lee un archivo `.ps1` que contiene strings con tildes directamente en el código, **los lee con encoding incorrecto** (Windows-1252) incluso si el archivo está guardado en UTF-8. Esto significa que aunque uses `Out-File -Encoding UTF8`, los strings ya están corruptos desde que PowerShell los leyó del script.

#### **✅ SOLUCIÓN IMPLEMENTADA:**

##### **Opción 1: Strings desde consola (Para pocas features)**
```powershell
# ✅ CORRECTO - Definir strings directamente en consola (funciona correctamente)
$featureName = "Corrección de Ciclo Infinito"
$description = "Descripción con tildes: específicamente, función, validación"

$body = @{
    projectId = 51
    featureName = $featureName
    description = $description
    # ... otros campos
} | ConvertTo-Json -Depth 3

$body | Out-File -FilePath "temp.json" -Encoding UTF8
Invoke-WebRequest -Uri $url -Method POST -Headers @{"Content-Type"="application/json; charset=utf-8"} -InFile "temp.json"
```

##### **Opción 2: Archivo JSON externo (RECOMENDADO para múltiples features)**
```powershell
# ✅ CORRECTO - Leer datos desde archivo JSON externo con encoding UTF-8 explícito
# 1. Crear archivo JSON externo (features-data.json) guardado en UTF-8
# 2. Leer con encoding UTF-8 explícito usando métodos de .NET

$jsonFile = "features-data.json"
# Leer JSON con encoding UTF-8 explícito
$jsonContent = [System.IO.File]::ReadAllText($jsonFile, [System.Text.Encoding]::UTF8)
$features = $jsonContent | ConvertFrom-Json

foreach ($feature in $features) {
    $body = @{
        projectId = 51
        featureName = $feature.featureName  # Ya viene correcto desde JSON
        description = $feature.description
        # ... otros campos
    } | ConvertTo-Json -Depth 3
    
    $body | Out-File -FilePath "temp.json" -Encoding UTF8
    Invoke-WebRequest -Uri $url -Method POST -Headers @{"Content-Type"="application/json; charset=utf-8"} -InFile "temp.json"
}
```

##### **Opción 3: Método incorrecto (NO USAR)**
```powershell
# ❌ INCORRECTO - Strings con tildes directamente en archivo .ps1
# PowerShell leerá el archivo con encoding incorrecto
$featureName = "Corrección de Ciclo Infinito"  # Ya está corrupto al leer el archivo

# ❌ INCORRECTO - Usa encoding por defecto
Invoke-WebRequest -Uri $url -Method POST -Body $jsonBody
```

#### **📋 CHECKLIST DE ENCODING:**
- [ ] ¿Evitas definir strings con tildes directamente en archivos `.ps1`?
- [ ] ¿Usas archivo JSON externo o defines strings en consola?
- [ ] ¿Lees archivos JSON con `[System.IO.File]::ReadAllText()` y encoding UTF-8 explícito?
- [ ] ¿Usas archivos temporales con `-Encoding UTF8` para el JSON de petición?
- [ ] ¿Incluyes header `charset=utf-8` en la petición?
- [ ] ¿Verificas que las tildes se muestren correctamente en el Project Tracker?
- [ ] ¿Limpias archivos temporales después del uso?

#### **📝 EJEMPLO COMPLETO - Patrón que funciona (Archivo JSON externo):**

**1. Crear archivo `features-data.json` (guardado en UTF-8):**
```json
[
  {
    "featureName": "Corrección de Ciclo Infinito en restart-server.bat",
    "description": "PROBLEMA: El script se quedaba en ciclo infinito. SOLICITUD: Corregir. ACTIVIDADES: 1) Agregado setlocal, 2) Modificado kill_port. RESULTADO: Funciona correctamente.",
    "priority": "alta",
    "category": "Bug Fix"
  }
]
```

**2. Script PowerShell que lee el JSON:**
```powershell
$projectTrackerUrl = "http://localhost:3005/api/project-tracker/features"
$projectId = 51
$jsonFile = "features-data.json"

# Leer JSON con encoding UTF-8 explícito
$jsonContent = [System.IO.File]::ReadAllText($jsonFile, [System.Text.Encoding]::UTF8)
$features = $jsonContent | ConvertFrom-Json

foreach ($feature in $features) {
    $body = @{
        projectId = $projectId
        featureName = $feature.featureName
        description = $feature.description
        status = "completada"
        priority = $feature.priority
        category = $feature.category
        assignedTo = "Sistema"
        isImprovement = $true
        requestedAt = (Get-Date).ToUniversalTime().ToString("s") + "Z"  # Usar requestedAt, createdAt es automático
    } | ConvertTo-Json -Depth 3
    
    $tempFile = "temp_feature.json"
    $body | Out-File -FilePath $tempFile -Encoding UTF8
    
    $response = Invoke-WebRequest -Uri $projectTrackerUrl -Method POST `
        -Headers @{"Content-Type"="application/json; charset=utf-8"} `
        -InFile $tempFile
    
    $result = $response.Content | ConvertFrom-Json
    Write-Host "✅ Feature creada: $($result.featureName)" -ForegroundColor Green
    Remove-Item $tempFile -Force
}
```

**⚠️ IMPORTANTE:** Este patrón garantiza que los caracteres con tildes se preserven correctamente desde el archivo JSON hasta el Project Tracker.

### **📅 GESTIÓN DE FECHAS DE CREACIÓN DE FEATURES**

#### **🚨 PROBLEMA CRÍTICO IDENTIFICADO:**
Las features reportadas al sistema deben reflejar la **fecha real de trabajo**, no la fecha de reporte. Esto es crucial para auditorías y seguimiento temporal del desarrollo.

#### **❌ ERROR COMÚN:**
```javascript
// ❌ INCORRECTO - Todas las features con fecha de hoy
{
  "requestedAt": "2025-01-27T20:23:29.000Z" // ❌ INCORRECTO: Fecha de reporte, no de trabajo
}
```

#### **✅ CORRECTO - Fechas Reales de Trabajo:**
```javascript
// ✅ CORRECTO - Fecha real cuando se trabajó
{
  "requestedAt": "2025-01-24T10:00:00.000Z" // Fecha real de trabajo (editable)
}
```

#### **📋 REGLAS PARA FECHAS DE FEATURES:**
1. **requestedAt = Fecha Real de Trabajo (Editable)**
   - Usar el campo `requestedAt` para especificar cuándo realmente se trabajó en la feature
   - NO usar fecha de reporte al sistema
   - Usar fecha cuando realmente se implementó la funcionalidad
   - Considerar el contexto del chat/conversación

2. **createdAt = Fecha Automática del Sistema (Inmutable)**
   - `createdAt` es automático y NO debe ser enviado en los endpoints
   - Se establece automáticamente cuando se crea el registro en la base de datos
   - Es el timestamp de creación del registro, no la fecha de trabajo

3. **Formato de Fecha:**
   - Usar formato ISO: `YYYY-MM-DDTHH:mm:ss.sssZ`
   - Ejemplo: `2025-01-24T14:30:00.000Z`
   - Solo enviar `requestedAt`, nunca `createdAt`

4. **Estimación de Fechas:**
   - **Hoy**: Para trabajo realizado en la sesión actual
   - **Ayer**: Para trabajo del día anterior
   - **2-3 días atrás**: Para trabajo de sesiones anteriores
   - **Semana pasada**: Para trabajo de la semana anterior

#### **🔧 ACTUALIZAR FECHAS DE FEATURES:**
```bash
# Usar el endpoint PUT para actualizar requestedAt
# El campo createdAt NO puede ser modificado (es inmutable)

# Ejemplo de actualización:
PUT /api/project-tracker/features/:featureId
{
  "requestedAt": "2025-01-24T10:00:00.000Z"
}
```

#### **📋 CHECKLIST DE FECHAS:**
- [ ] ¿La fecha refleja cuándo realmente se trabajó?
- [ ] ¿No es la fecha de reporte al sistema?
- [ ] ¿Considera el contexto temporal del chat?
- [ ] ¿Es consistente con otras features del mismo período?

#### **🚨 CONSECUENCIAS DE FECHAS INCORRECTAS:**
- **Auditorías confusas**: No se puede rastrear el progreso real
- **Métricas incorrectas**: Velocidad de desarrollo distorsionada
- **Seguimiento temporal**: Imposible entender la evolución del proyecto
- **Reportes gerenciales**: Datos incorrectos para toma de decisiones

### **📝 DOCUMENTACIÓN DETALLADA DE FEATURES - FORMATO ESTÁNDAR**

#### **🎯 FORMATO OBLIGATORIO PARA DESCRIPCIÓN DE FEATURES:**
```javascript
{
  "projectId": 51,
  "featureName": "Sistema de Semáforo para GitHub Push Dates",
  "description": "PROBLEMA: Usuario solicitó indicadores visuales para fechas de push a GitHub. SOLICITUD: Implementar sistema de semáforo con colores para mostrar días desde último push. ACTIVIDADES REALIZADAS: 1) Nueva columna 'Días' separada, 2) Componente GithubDaysStatus con semáforo de colores, 3) Colores: Azul (0-2 días), Amarillo (3-5 días), Rojo (>5 días), 4) Indicador '?' con círculo rojo para sin fecha, 5) Tooltips informativos. RESULTADO: Sistema de semáforo funcional con indicadores visuales claros.",
  "priority": "alta",
  "status": "completada",
  "requestedAt": "2025-01-24T10:00:00.000Z" // ⚠️ REQUERIDO: Fecha real de trabajo en formato ISO (usar requestedAt, createdAt es automático e inmutable)
}
```

#### **📋 ESTRUCTURA OBLIGATORIA DE LA DESCRIPCIÓN:**
1. **PROBLEMA:** Contexto del usuario y situación inicial
2. **SOLICITUD:** Qué se pidió específicamente  
3. **ACTIVIDADES REALIZADAS:** Lista numerada de implementaciones técnicas
4. **RESULTADO:** Estado final logrado y funcionalidades implementadas

#### **🏷️ FORMATO OBLIGATORIO PARA HISTORIAS:**
```javascript
{
  "changeType": "status",
  "oldValue": "pendiente",
  "newValue": "aprobado", 
  "comment": "ACTIVIDADES: Implementación completa del sistema de semáforo. ARCHIVOS: ProjectStatusIndicator.tsx, ProjectsManagement.tsx, types/index.ts. TECNOLOGÍAS: React, TypeScript, CSS. COMANDOS: Nuevo componente GithubDaysStatus, función calculateDaysSincePush, estilos de semáforo. IMPACTO: Sistema de indicadores visuales funcional con 3 colores y tooltips informativos.",
  "changeReason": "Implementación exitosa del sistema de semáforo solicitado",
  "changedBy": "Sistema",
  "commentType": "system"
}
```

#### **🔧 ESTRUCTURA OBLIGATORIA DEL COMENTARIO DE HISTORIA:**
1. **ACTIVIDADES:** Qué se hizo técnicamente
2. **ARCHIVOS:** Archivos modificados/creados (con extensiones)
3. **TECNOLOGÍAS:** Stack tecnológico usado
4. **COMANDOS:** Funciones/métodos/componentes implementados
5. **IMPACTO:** Resultado final y funcionalidades logradas

#### **📊 EJEMPLOS DE FEATURES BIEN DOCUMENTADAS:**
- **Feature 501:** Sistema de Semáforo para GitHub Push Dates
- **Feature 502:** Columna de Edad de Proyectos  
- **Feature 503:** Formato de Fechas Mejorado
- **Feature 504:** Reordenamiento de Columnas
- **Feature 505:** Backend API para GitHub Push Dates

#### **🚨 REGLAS CRÍTICAS DE DOCUMENTACIÓN:**
- **SIEMPRE incluir `requestedAt`** en formato ISO (`YYYY-MM-DDTHH:mm:ss.sssZ`) - ⚠️ **REQUERIDO** (createdAt es automático e inmutable)
- **SIEMPRE usar el formato de 4 secciones** en la descripción
- **SIEMPRE documentar archivos específicos** con extensiones
- **SIEMPRE incluir tecnologías utilizadas**
- **SIEMPRE explicar el impacto final**
- **SIEMPRE usar tildes correctas** en toda la documentación
- **SIEMPRE crear historias detalladas** para cada cambio de estado

#### **📋 CHECKLIST DE DOCUMENTACIÓN:**
- [ ] ⚠️ **¿Se incluyó `requestedAt` en formato ISO?** (REQUERIDO - createdAt es automático)
- [ ] ¿La fecha de creación refleja el día real de trabajo?
- [ ] ¿La descripción tiene las 4 secciones obligatorias?
- [ ] ¿Se mencionan archivos específicos con extensiones?
- [ ] ¿Se incluyen las tecnologías utilizadas?
- [ ] ¿Se explica claramente el impacto final?
- [ ] ¿Se creó una historia detallada del cambio?
- [ ] ¿Todas las tildes están correctas?
- [ ] ¿La documentación será comprensible en 15 días?

### **🔧 Comandos de Corrección para Features Existentes - CON ENCODING CORRECTO**
```powershell
# ✅ Corregir tildes en feature existente - Con solución de encoding
function Fix-FeatureAccents {
    param(
        [int]$FeatureId,
        [string]$NewName,
        [string]$NewDescription
    )
    
    $body = @{
        featureName = $NewName
        description = $NewDescription
    } | ConvertTo-Json -Depth 3
    
    # ✅ SOLUCIÓN DE ENCODING: Usar archivo temporal con UTF-8
    $body | Out-File -FilePath "temp_fix.json" -Encoding UTF8
    
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3005/api/project-tracker/features/$FeatureId" -Method PUT -Headers @{"Content-Type"="application/json; charset=utf-8"} -InFile "temp_fix.json"
        Write-Host "✅ Feature $FeatureId corregida" -ForegroundColor Green
        Remove-Item "temp_fix.json" -Force
    } catch {
        Write-Error "❌ Error corrigiendo feature: $($_.Exception.Message)"
        if (Test-Path "temp_fix.json") { Remove-Item "temp_fix.json" -Force }
    }
}
```

---

## 📱 **GUÍAS ESPECÍFICAS DE UI/UX**

### **DataTables Optimizadas**
```css
/* Estilos para tablas compactas */
.compact-table th {
  padding: 0.1rem !important;
  height: 32px !important;
  font-size: 0.75rem !important;
}

.compact-table td {
  padding: 0.01rem !important;
  height: 36px !important;
  vertical-align: middle !important;
}

.compact-table .btn {
  min-width: 20px !important;
  height: 16px !important;
  padding: 0.05rem !important;
}
```

### **Componentes Responsive**
```css
/* Responsive para móvil */
@media (max-width: 768px) {
  .mobile-menu-toggle {
    position: fixed;
    top: 1rem;
    left: 1rem;
    z-index: 1001;
  }
  
  .sidebar {
    transform: translateX(-100%);
    transition: transform 0.3s ease;
  }
  
  .sidebar.mobile-open {
    transform: translateX(0);
  }
}
```

## 📱 Debug Visual para Móviles

### **Problema Común**
Cuando desarrollamos aplicaciones web que deben funcionar en móviles, el debugging tradicional (consola del navegador) es difícil de acceder o no está disponible. Los usuarios reportan errores pero no podemos ver qué está pasando.

### **Solución: Debug Visual en Pantalla**
Crear componentes de debug que muestren información en tiempo real directamente en la interfaz de usuario, sin necesidad de consola.

### **Implementación Rápida**
1. **Componente de Debug Básico (Movible)**
   - Modal arrastrable y minimizable
   - Muestra información de conexión en tiempo real
   - Solo visible en desarrollo
   - Soporte completo para móvil y desktop

2. **Debug en Formularios/Procesos**
   - Mostrar información de debug durante operaciones críticas
   - Logs en tiempo real con timestamps
   - Información de red y API

3. **Página de Debug Dedicada**
   - Ruta `/debug` para testing completo
   - Tests de conectividad y endpoints
   - Logs detallados del sistema

### **Checklist de Implementación**
- [ ] Identificar problemas de debug móvil
- [ ] Implementar componente ConnectionDebug
- [ ] Agregar debug visual en formularios críticos
- [ ] Crear página de debug dedicada
- [ ] Probar en dispositivos móviles reales

---

## 🚨 **SOLUCIÓN DE PROBLEMAS COMUNES**

### **Error: "Cannot read properties of undefined"**
```javascript
// ❌ MALO
const count = diagnostic.files.count;

// ✅ BUENO
const count = diagnostic.files?.count || 0;
```

### **Error: "Puertos hardcoded"**
```javascript
// ❌ MALO
const backendPort = 3003;
const frontendPort = 3000;

// ✅ BUENO
const backendPort = 3000 + projectId;
const frontendPort = 4000 + projectId;
```

### **Error: "Modal muy ancho"**
```css
/* ❌ MALO */
.modal-dialog {
  max-width: 90%;
}

/* ✅ BUENO */
.modal-dialog {
  max-width: 70%;
}
```

## 📋 **CHECKLIST DE DESARROLLO**

### **Antes de Comenzar:**
- [ ] Verificar conexión al Project Tracker
- [ ] Confirmar puertos del proyecto
- [ ] Revisar features existentes
- [ ] Entender el contexto del problema

### **Durante el Desarrollo:**
- [ ] Usar puertos dinámicos (3000 + ID, 4000 + ID)
- [ ] Validar datos antes de procesar
- [ ] Incluir logs para debugging
- [ ] Probar en móvil y desktop
- [ ] Mantener tablas compactas

### **Antes de Finalizar:**
- [ ] Probar funcionalidad completa
- [ ] Verificar responsive design
- [ ] Confirmar que no hay errores en consola
- [ ] Documentar cambios importantes
- [ ] ⚠️ **Incluir `requestedAt` en formato ISO** (REQUERIDO - createdAt es automático)
- [ ] **Validar tildes en features reportadas**
- [ ] **Verificar encoding UTF-8 en peticiones**
- [ ] **Validar fechas reales de trabajo en features**
- [ ] **Confirmar que fechas no sean de reporte sino de trabajo**
- [ ] **Usar archivos temporales con -Encoding UTF8**
- [ ] **Incluir headers charset=utf-8**
- [ ] **Limpiar archivos temporales después del uso**
- [ ] **Validar formato de documentación de features (4 secciones)**
- [ ] **Verificar que historias incluyan ACTIVIDADES, ARCHIVOS, TECNOLOGÍAS, COMANDOS, IMPACTO**
- [ ] **Confirmar que documentación será comprensible en 15 días**
- [ ] Reportar progreso en Project Tracker

## 🎯 **COMANDOS ÚTILES**

### **Verificar Estado del Proyecto:**
```bash
# Verificar que el Project Tracker esté corriendo
curl http://localhost:3005/api/project-tracker/health

# Verificar proyecto específico
curl http://localhost:3005/api/project-tracker/projects/51
```

### **Gestión de Features - CON ENCODING CORRECTO:**
```bash
# Crear feature desde línea de comandos (CON TILDES CORRECTAS Y requestedAt REQUERIDO)
REQUESTED_AT=$(node -e "console.log(new Date().toISOString())")  # Usar requestedAt, createdAt es automático
curl -X POST http://localhost:3005/api/project-tracker/features \
  -H "Content-Type: application/json; charset=utf-8" \
  -d "{\"projectId\": 51, \"featureName\": \"Nueva Funcionalidad\", \"description\": \"Implementación de nueva funcionalidad con características específicas\", \"status\": \"pendiente\", \"requestedAt\": \"$REQUESTED_AT\"}"  # Usar requestedAt, createdAt es automático

# ✅ PowerShell CORRECTO - Con solución de encoding UTF-8 y requestedAt REQUERIDO
$requestedAt = (Get-Date).ToUniversalTime().ToString("s") + "Z"  # Usar requestedAt, createdAt es automático
$body = @{
    projectId = 51
    featureName = "Sistema de Optimización"
    description = "Implementación de sistema de optimización para mejorar rendimiento"
    status = "pendiente"
    requestedAt = $requestedAt  # ⚠️ REQUERIDO: Fecha real de trabajo en formato ISO (usar requestedAt, createdAt es automático)
} | ConvertTo-Json -Depth 3

$body | Out-File -FilePath "temp_feature.json" -Encoding UTF8
Invoke-WebRequest -Uri "http://localhost:3005/api/project-tracker/features" -Method POST -Headers @{"Content-Type"="application/json; charset=utf-8"} -InFile "temp_feature.json"
Remove-Item "temp_feature.json" -Force
```

### ⏰ Zona horaria y fechas de creación (requestedAt)

1) Backend
- El servidor usa zona por defecto `America/Bogota` (var env `TZ`).
- Puedes cambiarla exportando `TZ` antes de iniciar el backend.

2) Endpoints soportados
- `POST /api/project-tracker/features` acepta `requestedAt` (ISO-8601) para especificar la fecha real de trabajo. ⚠️ **IMPORTANTE**: `createdAt` es automático e inmutable, NO debe ser enviado. Usar `requestedAt` para la fecha de trabajo.
- `PUT  /api/project-tracker/features/:featureId` permite actualizar `requestedAt` (createdAt no puede ser modificado).

3) Ejemplos rápidos
```bash
# Shell: crear feature con fecha retroactiva (-3 días)
RETRO=$(node -e "const d=new Date(Date.now()-3*24*3600*1000);console.log(d.toISOString())")
curl -X POST http://localhost:3005/api/project-tracker/features \
  -H "Content-Type: application/json; charset=utf-8" \
  -d '{
    "projectId": 51,
    "featureName": "Feature con fecha retroactiva",
    "description": "Prueba de requestedAt",
    "priority": "media",
    "requestedAt": "'"$RETRO"'" // Usar requestedAt, createdAt es automático
  }'
```

```powershell
# PowerShell: enviar requestedAt (-2 días)
$requestedAt = (Get-Date).AddDays(-2).ToString("s") + "Z"  # Usar requestedAt, createdAt es automático
$body = @{
  projectId = 51
  featureName = "Feature con requestedAt retroactivo"
  description = "Prueba de TZ y fechas"
  priority = "media"
  requestedAt = $requestedAt  # Usar requestedAt, createdAt es automático
} | ConvertTo-Json -Depth 3
$body | Out-File -FilePath "temp_requestedAt.json" -Encoding UTF8
Invoke-WebRequest -Uri "http://localhost:3005/api/project-tracker/features" -Method POST -Headers @{"Content-Type"="application/json; charset=utf-8"} -InFile "temp_requestedAt.json"
Remove-Item "temp_requestedAt.json" -Force
```

4) Requisitos y Recomendaciones
- **REQUERIDO**: Enviar `requestedAt` siempre en formato ISO (`YYYY-MM-DDTHH:mm:ss.sssZ`) para especificar la fecha real de trabajo.
- ⚠️ **IMPORTANTE**: `createdAt` es automático e inmutable, NO debe ser enviado. El sistema lo establece automáticamente.
- Para corregir fechas históricas de features existentes, usa `PUT /features/:id` con `requestedAt`.
- **Fecha = Fecha Real de Trabajo**: Usar la fecha cuando realmente se implementó la funcionalidad, no la fecha de reporte al sistema.

## 📞 **SOPORTE**

Si encuentras problemas:
1. **Revisa los logs** del Project Tracker
2. **Verifica la conexión** con el script de arriba
3. **Confirma los puertos** del proyecto
4. **Reporta el error** con detalles completos

## 🎯 **RESUMEN: CÓMO SER UN AGENTE EXITOSO**

### **🚀 FÓRMULA DEL ÉXITO:**
```
TRANSPARENCIA + ESPECIFICIDAD + EFICIENCIA + VERIFICACIÓN = RESULTADOS EXCELENTES
```

### **📋 CHECKLIST MENTAL PARA CADA PROMPT:**

#### **ANTES DE RESPONDER:**
- [ ] ¿Entiendo exactamente qué se pide?
- [ ] ¿Puedo hacerlo con las herramientas disponibles?
- [ ] ¿Cuánto tiempo tomará aproximadamente?
- [ ] ¿Hay obstáculos potenciales?

#### **DURANTE LA EJECUCIÓN:**
- [ ] ¿Estoy siendo específico en mis acciones?
- [ ] ¿Estoy proporcionando feedback inmediato?
- [ ] ¿Estoy verificando resultados en cada paso?
- [ ] ¿Estoy siendo transparente sobre el proceso?

#### **DESPUÉS DE COMPLETAR:**
- [ ] ¿Funciona correctamente?
- [ ] ¿He probado en móvil y desktop?
- [ ] ¿No hay errores en consola?
- [ ] ¿He confirmado el éxito al usuario?

### **💡 FRASES CLAVE PARA USAR:**

#### **CONFIRMACIÓN:**
- "✅ Entendido, voy a [acción específica]"
- "🔧 Procedo a [acción] en [archivo específico]"

#### **PROGRESO:**
- "📊 Modificando [archivo] - línea [X] a [Y]"
- "🔍 Verificando [funcionalidad específica]"

#### **ALERTAS:**
- "⚠️ Este cambio puede afectar [componentes]"
- "⏱️ Esto tomará [tiempo] porque [razón]"

#### **CONFIRMACIÓN DE ÉXITO:**
- "✅ Cambio implementado y verificado"
- "📱 Probado en desktop y móvil - funciona correctamente"

#### **RECHAZO TRANSPARENTE:**
- "❌ No puedo hacer [X] porque [razón específica]"
- "🔄 Necesito [información] para proceder"

### **🎯 OBJETIVO FINAL:**
**Convertirte en un agente que resuelve problemas de manera rápida, específica y transparente, tal como lo hemos logrado en esta sesión.**

---

**¡Recuerda: Comunicación clara + Implementación eficiente + Transparencia total = Resultados excelentes!** 🚀
