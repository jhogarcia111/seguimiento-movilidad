# 🚀 Guía de Instalación

## 1. Pre-requisitos

- **Node.js** ≥ 18 (recomendado 20 LTS)
- **npm** ≥ 9
- Cuenta en [Neon](https://neon.tech) (o cualquier Postgres compatible)
- (Opcional) Token de [Twitter API v2](https://developer.twitter.com)
- (Opcional) Cuenta SMTP para enviar emails (Gmail, SendGrid, etc.)

## 2. Clonar e instalar dependencias

```bash
git clone <repo-url>
cd "Seguimiento Movilidad"
npm install
```

## 3. Configurar variables de entorno

```bash
cp .env.example .env.local
```

Edita `.env.local`:

```env
# Obligatorio
DATABASE_URL=postgresql://USER:PASS@HOST/neondb?sslmode=require
JWT_SECRET=algun_secreto_largo_y_unico

# Recomendado
TWITTER_BEARER_TOKEN=tu_bearer_token

# Opcional (emails)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu@gmail.com
SMTP_PASS=app_password
SMTP_FROM=noreply@transitotito.com
FRONTEND_URL=http://localhost:4051

# Opcional
JWT_EXPIRES_IN=7d
```

> ⚠️ `.env.local` está en `.gitignore` — NO lo commitees.

## 4. Iniciar en desarrollo

```bash
npm run dev
```

La app levanta en `http://localhost:4051`. En la primera petición se crean las tablas en PostgreSQL automáticamente y se inserta el usuario admin (admin / admin123).

## 5. Build y prueba de producción

```bash
npm run build
npm run start
```

## 6. Deploy en Vercel

```bash
npm i -g vercel
vercel
```

O bien:

1. Importa el repo desde el dashboard de Vercel.
2. Vercel detecta Next.js automáticamente.
3. Configura las env vars (Settings → Environment Variables).
4. Vercel reconoce las rutas con `export const maxDuration = 60` automáticamente.

> Para que Puppeteer funcione en serverless ya se incluyen `puppeteer-core` y `@sparticuz/chromium`. El helper `lib/puppeteer.js` cambia automáticamente entre Puppeteer local y la versión serverless usando `process.env.VERCEL`.

## 7. Solución de problemas

- **`DATABASE_URL debe ser una cadena postgresql://...`** → revisa que `.env.local` tenga `DATABASE_URL` correcta y reinicia `npm run dev`.
- **PWA no se instala** → debe estar en `npm run build` + `npm run start` (en dev está deshabilitada). HTTPS o `localhost` son requeridos.
- **Hidratación / leaflet** → `AnimatedMap` y `LocationMap` ya están envueltos con `dynamic({ ssr:false })`; si añades nuevos componentes que usen Leaflet, haz lo mismo.
- **Twitter rate limit** → revisa `/admin → API Status` y configura `twitter_data_source = 'mock'` mientras se recupera.
- **Emails no envían** → si `SMTP_*` está vacío, la app loguea un warning y continúa; revisa logs para detalles.
