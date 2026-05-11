# 📊 Fuentes de Datos para Movilidad y Accidentes en Bogotá

## Objetivo del Proyecto
Proporcionar información en tiempo real sobre problemas de movilidad en Bogotá, incluyendo:
- Accidentes de tránsito
- Obras viales
- Manifestaciones
- Desvíos
- Tráfico intenso
- Cualquier problema que afecte la movilidad

## Fuentes Actuales Implementadas

### 1. ✅ Twitter/X (Cuentas Oficiales)
**Estado:** Implementado
- **Cuentas monitoreadas:**
  - @SectorMovilidad
  - @BogotaTransito
  - @TransMilenio
  - @MinTransporteCo
- **Método:** API oficial de Twitter (gratis: 100 posts/mes)
- **Ventajas:**
  - Datos oficiales y confiables
  - Información en tiempo real
  - Información completa (métricas, fechas exactas)
- **Desventajas:**
  - Límite de 100 posts/mes en plan gratuito
  - Costos elevados en planes pagos ($175-$5000/mes)
  - Requiere Bearer Token

### 2. ✅ bogota.gov.co (Scraping)
**Estado:** Implementado
- **URL:** https://bogota.gov.co/mi-ciudad/movilidad/en-vivo-movilidad-bogota-y-rutas-transmilenio
- **Método:** Scraping con Cheerio
- **Ventajas:**
  - Datos oficiales del gobierno
  - Gratis
  - Sin límites de rate limit
- **Desventajas:**
  - Depende de la estructura HTML del sitio
  - Puede romperse si cambian el diseño
  - Puede ser más lento que APIs

## Fuentes Alternativas Disponibles

### 3. 🗺️ Waze API / Waze Live Map
**Estado:** No implementado (investigación necesaria)

**Información:**
- Waze tiene una API para partners, pero requiere aprobación
- Waze Live Map es público y muestra incidentes en tiempo real
- Los usuarios pueden reportar accidentes, obras, tráfico, etc.

**Opciones:**
1. **Waze Live Map (Scraping):**
   - URL: https://www.waze.com/live-map
   - Método: Scraping de la página pública
   - Ventajas: Datos en tiempo real, reportes de usuarios
   - Desventajas: Puede tener CAPTCHA, estructura HTML compleja

2. **Waze API (Partner Program):**
   - Requiere registro como partner
   - Puede tener costos
   - Requiere aprobación de Waze
   - Ventajas: Datos estructurados, API oficial
   - Desventajas: Proceso de aprobación, puede tener costos

**Implementación sugerida:**
- Scraping de Waze Live Map para Bogotá
- Extraer incidentes reportados por usuarios
- Filtrar por tipo (accidente, obra, tráfico, etc.)

### 4. 🗺️ Google Maps Traffic API
**Estado:** No implementado (investigación necesaria)

**Información:**
- Google Maps tiene APIs de tráfico, pero son limitadas
- Google Maps JavaScript API puede mostrar tráfico en tiempo real
- No hay API pública directa para incidentes de tráfico

**Opciones:**
1. **Google Maps JavaScript API:**
   - Puede mostrar tráfico en tiempo real
   - Requiere API key (gratis hasta cierto límite)
   - Ventajas: Datos de Google, confiables
   - Desventajas: No hay API directa para incidentes, solo tráfico

2. **Google Maps Directions API:**
   - Puede mostrar rutas y tiempo de viaje
   - Puede indicar tráfico intenso
   - Requiere API key (gratis hasta cierto límite)
   - Ventajas: Datos de Google, confiables
   - Desventajas: No muestra incidentes específicos, solo tráfico

**Implementación sugerida:**
- Usar Google Maps Traffic Layer para detectar tráfico intenso
- Combinar con otras fuentes para obtener información de incidentes

### 5. 📊 Datos Abiertos de Bogotá
**Estado:** No implementado (investigación necesaria)

**Información:**
- Bogotá tiene un portal de datos abiertos
- Puede tener datos históricos de accidentes
- Puede tener datos de tráfico y movilidad

**Opciones:**
1. **Portal de Datos Abiertos de Bogotá:**
   - URL: https://datosabiertos.bogota.gov.co/
   - Método: APIs REST o descarga de datasets
   - Ventajas: Datos oficiales, gratuitos, históricos
   - Desventajas: Puede no ser en tiempo real, formato puede variar

2. **Secretaría de Movilidad de Bogotá:**
   - Puede tener APIs o feeds RSS
   - Datos oficiales de accidentes y tráfico
   - Ventajas: Datos oficiales, confiables
   - Desventajas: Puede requerir solicitud de acceso

**Implementación sugerida:**
- Investigar APIs disponibles en datosabiertos.bogota.gov.co
- Buscar datasets de accidentes y tráfico
- Implementar scraping o API calls según disponibilidad

### 6. 🚗 TomTom Traffic API
**Estado:** No implementado (investigación necesaria)

**Información:**
- TomTom tiene APIs de tráfico y incidentes
- Requiere API key
- Tiene plan gratuito con límites
- Ventajas: Datos estructurados, API oficial, incidentes detallados
- Desventajas: Puede tener costos, requiere registro

**Implementación sugerida:**
- Registrar en TomTom Developer Portal
- Obtener API key
- Implementar integración con TomTom Traffic API

### 7. 🗺️ HERE Traffic API
**Estado:** No implementado (investigación necesaria)

**Información:**
- HERE tiene APIs de tráfico y incidentes
- Requiere API key
- Tiene plan gratuito con límites
- Ventajas: Datos estructurados, API oficial, incidentes detallados
- Desventajas: Puede tener costos, requiere registro

**Implementación sugerida:**
- Registrar en HERE Developer Portal
- Obtener API key
- Implementar integración con HERE Traffic API

### 8. 📱 APIs de Aplicaciones de Tránsito
**Estado:** No implementado (investigación necesaria)

**Opciones:**
1. **Moovit API:**
   - API para información de transporte público
   - Puede tener información de tráfico
   - Requiere API key
   - Ventajas: Datos de transporte público, incidentes
   - Desventajas: Puede tener costos, requiere registro

2. **Citymapper API:**
   - API para información de transporte y tráfico
   - Requiere API key
   - Ventajas: Datos de transporte, incidentes
   - Desventajas: Puede tener costos, requiere registro

## Recomendaciones de Implementación

### Fase 1: Fuentes Gratuitas (Prioridad Alta)
1. ✅ **Twitter/X API** (Ya implementado)
   - Usar plan gratuito (100 posts/mes)
   - Optimizar con cache de 24 horas

2. ✅ **bogota.gov.co** (Ya implementado)
   - Mantener scraping actual
   - Mejorar parsing si es necesario

3. 🔄 **Waze Live Map (Scraping)**
   - Implementar scraping de Waze Live Map
   - Extraer incidentes reportados por usuarios
   - Filtrar por tipo y ubicación

4. 🔄 **Datos Abiertos de Bogotá**
   - Investigar APIs disponibles
   - Implementar integración con datos abiertos
   - Usar para datos históricos y complementarios

### Fase 2: APIs con Plan Gratuito (Prioridad Media)
5. 🔄 **Google Maps Traffic API**
   - Usar para detectar tráfico intenso
   - Combinar con otras fuentes para incidentes

6. 🔄 **TomTom Traffic API**
   - Evaluar plan gratuito
   - Implementar si es viable

### Fase 3: APIs Pagas (Prioridad Baja - Solo cuando haya monetización)
7. 🔄 **HERE Traffic API**
   - Evaluar cuando haya monetización
   - Implementar si es necesario

8. 🔄 **APIs de Aplicaciones de Tránsito**
   - Evaluar cuando haya monetización
   - Implementar si es necesario

## Estrategia de Implementación Sugerida

### Opción 1: Enfoque Multi-Fuente (Recomendado)
- Combinar múltiples fuentes gratuitas
- Twitter/X API (100 posts/mes)
- bogota.gov.co (scraping)
- Waze Live Map (scraping)
- Datos Abiertos de Bogotá (API o scraping)

**Ventajas:**
- Datos más completos
- Redundancia (si una fuente falla, otras funcionan)
- Sin costos adicionales
- Datos reales y confiables

**Desventajas:**
- Requiere mantener múltiples integraciones
- Puede ser más complejo de mantener

### Opción 2: Enfoque API Oficial
- Usar solo APIs oficiales
- Twitter/X API
- TomTom o HERE Traffic API (cuando haya monetización)

**Ventajas:**
- Datos estructurados
- Más confiables
- Menos mantenimiento

**Desventajas:**
- Costos en APIs pagas
- Límites en APIs gratuitas

## Próximos Pasos

1. **Investigar Waze Live Map:**
   - Analizar estructura HTML
   - Implementar scraping de incidentes
   - Probar con Puppeteer si es necesario

2. **Investigar Datos Abiertos de Bogotá:**
   - Revisar portal de datos abiertos
   - Identificar APIs o datasets relevantes
   - Implementar integración

3. **Evaluar Google Maps Traffic API:**
   - Revisar documentación
   - Evaluar costos del plan gratuito
   - Implementar si es viable

4. **Crear sistema de agregación:**
   - Combinar datos de múltiples fuentes
   - Eliminar duplicados
   - Priorizar por relevancia y confiabilidad

## Notas Importantes

- **Legalidad:** Asegurarse de cumplir con términos de servicio de cada plataforma
- **Rate Limits:** Respetar límites de cada API
- **Cache:** Implementar cache agresivo para minimizar requests
- **Fallbacks:** Siempre tener fallbacks si una fuente falla
- **Monetización:** Considerar costos solo cuando haya usuarios y monetización

