# 📱 Guía de Debug Visual para Móviles

## Problema Común
En dispositivos móviles es difícil acceder a la consola del navegador. Esto complica diagnosticar errores reportados por usuarios.

## Solución: Debug Visual en Pantalla
Implementar componentes que muestren información de debug directamente en la interfaz de usuario, sin depender de la consola.

## Implementación Rápida
1. Componente de Debug Básico (Movible)
   - Modal arrastrable/minimizable
   - Muestra estado de conexión, última acción, tiempos, etc.
   - Visible solo en entornos de desarrollo
2. Debug en Formularios/Procesos
   - Logs en tiempo real con timestamps
   - Información de red y respuesta de APIs
3. Página de Debug Dedicada
   - Ruta `/debug` con pruebas de conectividad y endpoints
   - Panel de logs detallados

## Checklist de Implementación
- [ ] Identificar escenarios móviles a depurar
- [ ] Agregar componente `ConnectionDebug`
- [ ] Inyectar debug en formularios críticos
- [ ] Crear página `/debug`
- [ ] Probar en dispositivos reales

## Recomendaciones
- Activar/ocultar el debug mediante variable de entorno
- Evitar datos sensibles en los logs
- Mantener estilos compactos y no intrusivos

---
Esta guía está pensada para acompañar a la Guía de Integración con Cursor y facilitar el diagnóstico en móviles.

