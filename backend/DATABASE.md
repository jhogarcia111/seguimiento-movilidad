# 🗄️ Configuración de Base de Datos MySQL/MariaDB

## Configuración Actual

La aplicación está configurada para usar MySQL/MariaDB con las siguientes credenciales por defecto:

- **Host**: 127.0.0.1
- **Port**: 3306
- **Usuario**: root
- **Contraseña**: wcdmocol
- **Base de Datos**: seguimiento_movilidad

## Variables de Entorno

Configura estas variables en `backend/.env`:

```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=wcdmocol
DB_NAME=seguimiento_movilidad
```

## Tablas Creadas Automáticamente

Al iniciar el servidor, se crearán automáticamente las siguientes tablas:

### `incidents`
Almacena incidentes de movilidad cacheados por sector.

```sql
CREATE TABLE incidents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sector VARCHAR(255) NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  incident_data TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME,
  INDEX idx_sector (sector),
  INDEX idx_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### `scraping_cache`
Almacena cache de scraping de bogota.gov.co.

```sql
CREATE TABLE scraping_cache (
  id INT AUTO_INCREMENT PRIMARY KEY,
  data TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME,
  INDEX idx_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

## Instalación de Dependencias

Asegúrate de tener instalado `mysql2`:

```bash
cd backend
npm install
```

## Verificación

1. Asegúrate de que MySQL/MariaDB esté corriendo
2. Verifica que la base de datos `seguimiento_movilidad` exista
3. Inicia el servidor: `npm run dev`
4. Deberías ver: `✅ Base de datos MySQL/MariaDB conectada: seguimiento_movilidad`

## Troubleshooting

### Error: "Access denied for user"

- Verifica usuario y contraseña en `.env`
- Asegúrate de que el usuario tenga permisos en la base de datos

### Error: "Unknown database 'seguimiento_movilidad'"

- Crea la base de datos manualmente:
  ```sql
  CREATE DATABASE seguimiento_movilidad CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
  ```

### Error: "Can't connect to MySQL server"

- Verifica que MySQL/MariaDB esté corriendo
- Verifica host y puerto en `.env`
