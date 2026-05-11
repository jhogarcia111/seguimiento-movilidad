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

## Migración desde MySQL

Si tenías datos en MySQL local, expórtalos e impórtalos manualmente a Postgres (tipos y SQL difieren). Una base Neon nueva arranca vacía salvo el esquema creado por el backend.
