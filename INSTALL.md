# 🚀 Guía de Instalación Completa

## Paso 1: Clonar/Descargar el Proyecto

Si tienes el proyecto ya, continúa con el siguiente paso.

## Paso 2: Instalar Dependencias del Backend

```bash
cd backend
npm install
```

**Dependencias principales:**
- express
- better-sqlite3
- cheerio
- axios
- compromise (NLP)
- natural (NLP)

## Paso 3: Configurar Variables de Entorno - Backend

Crea el archivo `backend/.env`:

```bash
cd backend
cp .env.example .env
```

Edita `backend/.env` con tus valores:

```env
PORT=3051
NODE_ENV=development

# Twitter/X API v2 (Opcional - si no lo tienes, usará mock data)
TWITTER_BEARER_TOKEN=tu_bearer_token_aqui

# Google Maps API (Opcional - usa Nominatim si no lo tienes)
GOOGLE_MAPS_API_KEY=tu_api_key_aqui
USE_NOMINATIM=true

# Base de datos (se crea automáticamente)
DB_PATH=./data/mobility.db

# Cache
TWEET_CACHE_HOURS=4
SCRAPE_CACHE_MINUTES=30
```

### Obtener Twitter Bearer Token (Opcional)

1. Ve a https://developer.twitter.com/
2. Crea una app o usa una existente
3. Ve a "Keys and Tokens"
4. Genera un Bearer Token
5. Cópialo a `TWITTER_BEARER_TOKEN` en `.env`

**Nota:** Si no tienes token, la app funcionará con datos mock para desarrollo.

## Paso 4: Instalar Dependencias del Frontend

```bash
cd frontend
npm install
```

**Dependencias principales:**
- react
- react-dom
- react-router-dom
- @tanstack/react-query
- axios
- vite-plugin-pwa

## Paso 5: Configurar Variables de Entorno - Frontend

Crea el archivo `frontend/.env`:

```bash
cd frontend
# El archivo .env.example ya existe, cópialo
```

Edita `frontend/.env`:

```env
VITE_API_URL=http://localhost:3051
```

## Paso 6: Iniciar el Backend

En una terminal:

```bash
cd backend
npm run dev
```

Deberías ver:
```
✅ Base de datos conectada: ./data/mobility.db
✅ Tablas de base de datos creadas
🚀 Servidor corriendo en http://localhost:3051
📊 Health check: http://localhost:3051/health
```

## Paso 7: Iniciar el Frontend

En otra terminal:

```bash
cd frontend
npm run dev
```

Deberías ver:
```
VITE v5.x.x ready in xxx ms

➜  Local:   http://localhost:4051/
```

## Paso 8: Probar la Aplicación

1. Abre http://localhost:4051 en tu navegador
2. Ve a "Buscar Sector"
3. Prueba con: "Avenida Boyacá" o "Calle 72"

## Verificación

### Backend Health Check

```bash
curl http://localhost:3051/health
```

Debería responder:
```json
{
  "status": "ok",
  "timestamp": "2025-01-27T...",
  "service": "Seguimiento Movilidad API"
}
```

### Probar Endpoint de Movilidad

```bash
curl "http://localhost:3051/api/mobility/sector?sector=Avenida%20Boyacá"
```

## Troubleshooting

### Error: "Cannot find module"

```bash
# Asegúrate de instalar dependencias en ambos proyectos
cd backend && npm install
cd ../frontend && npm install
```

### Error: "Port already in use"

```bash
# Cambia el puerto en .env o cierra la aplicación que usa el puerto
```

### Error: "Twitter API error"

- Sin problema, la app usará datos mock si no tienes token
- Los datos mock incluyen ejemplos para "Avenida Boyacá"

### Error: Base de datos

- La base de datos se crea automáticamente
- Si hay problemas, elimina `backend/data/mobility.db` y reinicia

## Próximos Pasos

1. ✅ Instalar dependencias (backend y frontend)
2. ✅ Configurar `.env` files
3. ✅ Iniciar ambos servidores
4. ✅ Probar la aplicación
5. 🔄 (Opcional) Configurar Twitter Bearer Token
6. 🔄 (Opcional) Configurar Google Maps API

¡Listo! La aplicación está funcionando. 🎉
