import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

let pool = null;

/**
 * Inicializa la conexión a la base de datos MySQL/MariaDB
 */
export async function initDatabase() {
  try {
    // Forzar recarga del .env para asegurar que se lee correctamente
    dotenv.config({ override: true });
    
    const config = {
      host: process.env.DB_HOST || '127.0.0.1',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'wcdmocol',
      database: process.env.DB_NAME || 'seguimiento_movilidad',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      charset: 'utf8mb4'
    };

    // Log de debug para ver qué base de datos se va a usar
    console.log('🔍 Configuración de BD:');
    console.log('   DB_NAME desde .env:', process.env.DB_NAME || 'NO DEFINIDO');
    console.log('   Base de datos que se usará:', config.database);
    
    pool = mysql.createPool(config);
    
    // Probar la conexión
    const connection = await pool.getConnection();
    console.log('✅ Base de datos MySQL/MariaDB conectada:', config.database);
    connection.release();

    // Crear tablas
    await createTables();
  } catch (error) {
    console.error('❌ Error inicializando base de datos:', error.message);
    throw error;
  }
}

/**
 * Crea las tablas necesarias
 */
async function createTables() {
  try {
    // Tabla de incidentes cacheados
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS incidents (
        id INT AUTO_INCREMENT PRIMARY KEY,
        sector VARCHAR(255) NOT NULL,
        latitude DECIMAL(10, 8),
        longitude DECIMAL(11, 8),
        incident_data TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME,
        INDEX idx_sector (sector),
        INDEX idx_expires (expires_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Tabla de scraping cacheado
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS scraping_cache (
        id INT AUTO_INCREMENT PRIMARY KEY,
        data TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME,
        INDEX idx_expires (expires_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Tabla de usuarios
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(100) NOT NULL UNIQUE,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        role ENUM('admin', 'usuario') DEFAULT 'usuario',
        is_active BOOLEAN DEFAULT TRUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_username (username),
        INDEX idx_email (email),
        INDEX idx_role (role),
        INDEX idx_active (is_active)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Tabla de fuentes de información
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS sources (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        type ENUM('twitter', 'web', 'api') DEFAULT 'twitter',
        identifier VARCHAR(255) NOT NULL UNIQUE COMMENT 'Username de Twitter, URL de web, etc.',
        description TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_type (type),
        INDEX idx_active (is_active)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Tabla de tags/categorías
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS tags (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        color VARCHAR(7) DEFAULT '#1a73e8',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_name (name)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Tabla de relación fuente-tags
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS source_tags (
        id INT AUTO_INCREMENT PRIMARY KEY,
        source_id INT NOT NULL,
        tag_id INT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (source_id) REFERENCES sources(id) ON DELETE CASCADE,
        FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE,
        UNIQUE KEY unique_source_tag (source_id, tag_id),
        INDEX idx_source (source_id),
        INDEX idx_tag (tag_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Tabla de búsquedas realizadas
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS searches (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        sector VARCHAR(255) NOT NULL,
        latitude DECIMAL(10, 8),
        longitude DECIMAL(11, 8),
        search_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        results_count INT DEFAULT 0,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user (user_id),
        INDEX idx_search_date (search_date),
        INDEX idx_sector (sector)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Tabla de resultados de búsquedas (snapshot del momento)
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS search_results (
        id INT AUTO_INCREMENT PRIMARY KEY,
        search_id INT NOT NULL,
        incident_id VARCHAR(255) NOT NULL,
        type VARCHAR(50),
        title VARCHAR(500),
        description TEXT,
        source VARCHAR(100),
        location VARCHAR(255),
        coordinates JSON,
        url VARCHAR(500),
        timestamp DATETIME,
        result_data JSON,
        FOREIGN KEY (search_id) REFERENCES searches(id) ON DELETE CASCADE,
        INDEX idx_search (search_id),
        INDEX idx_type (type),
        INDEX idx_source (source)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Tabla de cache general de problemas de movilidad
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS general_mobility_cache (
        id INT AUTO_INCREMENT PRIMARY KEY,
        incidents_data TEXT NOT NULL COMMENT 'JSON con todos los incidentes',
        last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME NOT NULL,
        INDEX idx_expires (expires_at),
        INDEX idx_last_updated (last_updated)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Crear usuario admin por defecto si no existe
    await createDefaultAdmin();

    // Crear tags y fuentes iniciales si no existen
    await createDefaultTagsAndSources();

    console.log('✅ Tablas de base de datos creadas/verificadas');
  } catch (error) {
    console.error('❌ Error creando tablas:', error.message);
    throw error;
  }
}

/**
 * Crea usuario admin por defecto
 */
async function createDefaultAdmin() {
  try {
    const [users] = await pool.execute('SELECT id FROM users WHERE role = ?', ['admin']);
    
    if (users.length === 0) {
      const bcrypt = await import('bcrypt');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      await pool.execute(`
        INSERT INTO users (username, email, password_hash, role, is_active)
        VALUES (?, ?, ?, ?, ?)
      `, ['admin', 'admin@movilidad.com', hashedPassword, 'admin', true]);
      
      console.log('✅ Usuario admin creado (admin/admin123)');
    }
  } catch (error) {
    console.error('Error creando admin por defecto:', error.message);
  }
}

/**
 * Crea tags y fuentes iniciales
 */
async function createDefaultTagsAndSources() {
  try {
    // Crear tags iniciales
    const defaultTags = [
      { name: 'movilidad', description: 'Problemas de movilidad en general', color: '#1a73e8' },
      { name: 'transmilenio', description: 'Información relacionada con TransMilenio', color: '#ea4335' },
      { name: 'accidentes', description: 'Accidentes de tránsito', color: '#fbbc04' },
      { name: 'manifestaciones', description: 'Manifestaciones y bloqueos', color: '#34a853' },
      { name: 'obras', description: 'Obras y mantenimiento vial', color: '#ff6d01' },
      { name: 'desvíos', description: 'Desvíos y cierres viales', color: '#9c27b0' }
    ];

    for (const tag of defaultTags) {
      await pool.execute(`
        INSERT IGNORE INTO tags (name, description, color)
        VALUES (?, ?, ?)
      `, [tag.name, tag.description, tag.color]);
    }

    // Crear fuentes iniciales
    const defaultSources = [
      { name: '@SectorMovilidad', type: 'twitter', identifier: 'SectorMovilidad', tags: ['movilidad', 'manifestaciones', 'obras', 'desvíos'] },
      { name: '@BogotaTransito', type: 'twitter', identifier: 'BogotaTransito', tags: ['movilidad', 'accidentes', 'desvíos'] },
      { name: '@TransMilenio', type: 'twitter', identifier: 'TransMilenio', tags: ['transmilenio', 'movilidad', 'desvíos'] },
      { name: 'bogota.gov.co', type: 'web', identifier: 'https://bogota.gov.co/mi-ciudad/movilidad/en-vivo-movilidad-bogota-y-rutas-transmilenio', tags: ['movilidad', 'transmilenio', 'manifestaciones', 'obras'] }
    ];

    for (const source of defaultSources) {
      const [result] = await pool.execute(`
        INSERT IGNORE INTO sources (name, type, identifier, description, is_active)
        VALUES (?, ?, ?, ?, ?)
      `, [source.name, source.type, source.identifier, `Fuente oficial de ${source.name}`, true]);

      if (result.insertId || result.affectedRows > 0) {
        const sourceId = result.insertId || (await pool.execute('SELECT id FROM sources WHERE identifier = ?', [source.identifier]))[0][0].id;
        
        // Asignar tags a la fuente
        for (const tagName of source.tags) {
          const [tagRows] = await pool.execute('SELECT id FROM tags WHERE name = ?', [tagName]);
          if (tagRows.length > 0) {
            await pool.execute(`
              INSERT IGNORE INTO source_tags (source_id, tag_id)
              VALUES (?, ?)
            `, [sourceId, tagRows[0].id]);
          }
        }
      } else {
        // Si ya existe, obtener su ID
        const [existing] = await pool.execute('SELECT id FROM sources WHERE identifier = ?', [source.identifier]);
        if (existing.length > 0) {
          const sourceId = existing[0].id;
          
          // Asignar tags a la fuente existente
          for (const tagName of source.tags) {
            const [tagRows] = await pool.execute('SELECT id FROM tags WHERE name = ?', [tagName]);
            if (tagRows.length > 0) {
              await pool.execute(`
                INSERT IGNORE INTO source_tags (source_id, tag_id)
                VALUES (?, ?)
              `, [sourceId, tagRows[0].id]);
            }
          }
        }
      }
    }

    console.log('✅ Tags y fuentes iniciales creados');
  } catch (error) {
    console.error('Error creando tags y fuentes iniciales:', error.message);
  }
}

/**
 * Obtiene el pool de conexiones
 */
export function getDatabase() {
  if (!pool) {
    throw new Error('Base de datos no inicializada. Llama a initDatabase() primero.');
  }
  return pool;
}
