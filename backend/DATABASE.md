# Base de datos — PostgreSQL (Neon)

El backend usa **PostgreSQL** mediante el paquete `pg`. En producción se recomienda **Neon**.

## Variable de entorno

En `backend/.env`:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST/neondb?sslmode=require
```

Puedes copiar la cadena desde el panel de Neon (**Connection string**). No commitees el archivo `.env`.

## Inicialización

Al arrancar el servidor (`npm run dev` o `npm start`), se crean las tablas si no existen y se cargan datos por defecto (admin `admin` / `admin123`, fuentes y tags iniciales).

## Probar conexión

```bash
cd backend
npm run test:db
```

## API REST auto-generada de Neon

Neon puede mostrar una URL tipo `.../rest/v1` para acceso REST directo. **Esta aplicación no la usa**: el servidor Express habla SQL con `pg` y tus rutas `/api/...`.

## Despliegue en Vercel (Services)

En la raíz del repo hay `vercel.json` con `experimentalServices`: frontend (Vite) en `/` y backend (Express) en `/_/backend`.

- En **Vercel → Settings → Environment Variables**, define en **todos los entornos** (o al menos en Production y Preview) las variables del **servicio backend**: `DATABASE_URL`, `JWT_SECRET`, etc.
- El frontend en `*.vercel.app` usa por defecto la API en `https://<tu-host>.vercel.app/_/backend` (ver `frontend/src/services/api.js`). Con **dominio propio**, define `VITE_API_URL` con la URL completa del API (incluyendo `/_/backend` si sigues usando Services).

## Migración desde MySQL

Si tenías datos en MySQL local, expórtalos e impórtalos manualmente a Postgres (tipos y SQL difieren). Una base Neon nueva arranca vacía salvo el esquema creado por el backend.
