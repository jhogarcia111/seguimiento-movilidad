import pg from 'pg';

const { Pool } = pg;

const POOL_KEY = '__SEG_MOV_PG_POOL__';
const INIT_KEY = '__SEG_MOV_PG_INIT__';

function mysqlPlaceholdersToPg(sql, params) {
  const values = params == null ? [] : [...params];
  let n = 0;
  const text = sql.replace(/\?/g, () => {
    n += 1;
    return `$${n}`;
  });
  if (n !== values.length) {
    throw new Error(`SQL tiene ${n} placeholders pero se recibieron ${values.length} parámetros`);
  }
  return { text, values };
}

async function execute(pool, sql, params = []) {
  const { text, values } = mysqlPlaceholdersToPg(sql, params);
  let finalText = text.trim();
  const upper = finalText.toUpperCase();

  if (upper.startsWith('INSERT') && !/\bRETURNING\b/i.test(finalText)) {
    if (!/\bINSERT\s+INTO\s+[\w.]+\s*\([^)]+\)\s*SELECT\b/i.test(finalText)) {
      finalText = finalText.replace(/;\s*$/i, '') + ' RETURNING id';
    }
  }

  const result = await pool.query(finalText, values);
  const cmd = result.command;

  if (cmd === 'SELECT' || (cmd === 'UNKNOWN' && upper.startsWith('WITH'))) {
    return [result.rows];
  }

  if (cmd === 'INSERT') {
    return [{
      affectedRows: result.rowCount ?? 0,
      insertId: result.rows?.[0]?.id ?? 0,
    }];
  }

  return [{ affectedRows: result.rowCount ?? 0, insertId: 0 }];
}

function buildPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString || !connectionString.startsWith('postgres')) {
    throw new Error(
      'DATABASE_URL debe ser una cadena postgresql://... (configúrala en .env.local). MySQL ya no está soportado en este proyecto.'
    );
  }
  return new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 15000,
  });
}

function getPool() {
  if (!globalThis[POOL_KEY]) {
    globalThis[POOL_KEY] = buildPool();
  }
  return globalThis[POOL_KEY];
}

export function getDatabase() {
  const pool = getPool();
  return {
    execute: (sql, params) => execute(pool, sql, params),
  };
}

export async function ensureDatabaseInitialized() {
  if (globalThis[INIT_KEY]) return globalThis[INIT_KEY];

  globalThis[INIT_KEY] = (async () => {
    const pool = getPool();
    const client = await pool.connect();
    try {
      await client.query('SELECT 1');
      console.log('✅ Base de datos PostgreSQL conectada (Neon/pooler)');
    } finally {
      client.release();
    }
    await createTables(pool);
  })();

  try {
    await globalThis[INIT_KEY];
  } catch (err) {
    globalThis[INIT_KEY] = null;
    throw err;
  }

  return globalThis[INIT_KEY];
}

export const initDatabase = ensureDatabaseInitialized;

async function createTables(pool) {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS incidents (
        id SERIAL PRIMARY KEY,
        sector VARCHAR(255) NOT NULL,
        latitude NUMERIC(10, 8),
        longitude NUMERIC(11, 8),
        incident_data TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMPTZ
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_incidents_sector ON incidents (sector)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_incidents_expires ON incidents (expires_at)`);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS scraping_cache (
        id SERIAL PRIMARY KEY,
        data TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMPTZ
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_scraping_cache_expires ON scraping_cache (expires_at)`);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS waze_cache (
        id SERIAL PRIMARY KEY,
        latitude NUMERIC(10, 8) NOT NULL,
        longitude NUMERIC(11, 8) NOT NULL,
        radius INTEGER NOT NULL,
        incidents_data TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMPTZ
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_waze_cache_expires ON waze_cache (expires_at)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_waze_cache_location ON waze_cache (latitude, longitude)`);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(100) NOT NULL UNIQUE,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'usuario' CHECK (role IN ('admin', 'usuario')),
        is_active BOOLEAN DEFAULT TRUE,
        approval_status VARCHAR(20) DEFAULT 'pending' CHECK (approval_status IN ('active', 'pending', 'inactive')),
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_users_username ON users (username)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_users_email ON users (email)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_users_role ON users (role)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_users_active ON users (is_active)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_users_approval ON users (approval_status)`);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS sources (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(20) DEFAULT 'twitter' CHECK (type IN ('twitter', 'web', 'api')),
        identifier VARCHAR(255) NOT NULL UNIQUE,
        description TEXT,
        city VARCHAR(255),
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_sources_type ON sources (type)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_sources_active ON sources (is_active)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_sources_city ON sources (city)`);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS tags (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        color VARCHAR(7) DEFAULT '#1a73e8',
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_tags_name ON tags (name)`);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS source_tags (
        id SERIAL PRIMARY KEY,
        source_id INTEGER NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
        tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (source_id, tag_id)
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_source_tags_source ON source_tags (source_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_source_tags_tag ON source_tags (tag_id)`);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS searches (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        sector VARCHAR(255) NOT NULL,
        url TEXT,
        latitude NUMERIC(10, 8),
        longitude NUMERIC(11, 8),
        search_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        results_count INTEGER DEFAULT 0
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_searches_user ON searches (user_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_searches_date ON searches (search_date)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_searches_sector ON searches (sector)`);

    const colCheck = await pool.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'searches' AND column_name = 'url'
    `);
    if (colCheck.rows.length === 0) {
      await pool.query('ALTER TABLE searches ADD COLUMN url TEXT');
      console.log('✅ Columna url agregada a searches');
    }

    await pool.query(`
      CREATE TABLE IF NOT EXISTS search_results (
        id SERIAL PRIMARY KEY,
        search_id INTEGER NOT NULL REFERENCES searches(id) ON DELETE CASCADE,
        incident_id VARCHAR(255) NOT NULL,
        type VARCHAR(50),
        title VARCHAR(500),
        description TEXT,
        source VARCHAR(100),
        location VARCHAR(255),
        coordinates JSONB,
        url VARCHAR(500),
        timestamp TIMESTAMPTZ,
        result_data JSONB
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_search_results_search ON search_results (search_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_search_results_type ON search_results (type)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_search_results_source ON search_results (source)`);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS general_mobility_cache (
        id SERIAL PRIMARY KEY,
        incidents_data TEXT NOT NULL,
        last_updated TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMPTZ NOT NULL
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_gmc_expires ON general_mobility_cache (expires_at)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_gmc_updated ON general_mobility_cache (last_updated)`);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS tweets_cache (
        id SERIAL PRIMARY KEY,
        tweet_id VARCHAR(255) NOT NULL UNIQUE,
        text TEXT NOT NULL,
        author_id VARCHAR(255) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL,
        public_metrics JSONB,
        cached_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_tweets_cache_tweet_id ON tweets_cache (tweet_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_tweets_cache_author ON tweets_cache (author_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_tweets_cache_created ON tweets_cache (created_at)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_tweets_cache_cached ON tweets_cache (cached_at)`);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS system_config (
        id SERIAL PRIMARY KEY,
        config_key VARCHAR(100) NOT NULL UNIQUE,
        config_value TEXT NOT NULL,
        description TEXT,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_system_config_key ON system_config (config_key)`);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_activities (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        activity_type VARCHAR(20) NOT NULL CHECK (activity_type IN ('login', 'logout', 'search', 'app_open')),
        activity_data JSONB,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_ua_user ON user_activities (user_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_ua_type ON user_activities (activity_type)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_ua_created ON user_activities (created_at)`);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        notification_type VARCHAR(40) NOT NULL CHECK (notification_type IN (
          'new_user', 'user_approved', 'user_deactivated', 'source_added', 'source_updated'
        )),
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        link_url VARCHAR(500),
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        read_at TIMESTAMPTZ
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_notif_read ON notifications (is_read)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_notif_created ON notifications (created_at)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications (user_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_notif_type ON notifications (notification_type)`);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS api_usage_stats (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        total_requests INTEGER DEFAULT 0,
        successful_requests INTEGER DEFAULT 0,
        failed_requests INTEGER DEFAULT 0,
        last_request_time TIMESTAMPTZ,
        rate_limit_remaining INTEGER,
        rate_limit_reset TIMESTAMPTZ,
        rate_limit_limit INTEGER,
        api_exceeded BOOLEAN DEFAULT FALSE,
        api_exceeded_until TIMESTAMPTZ,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      INSERT INTO system_config (config_key, config_value, description)
      VALUES ('twitter_data_source', '"api"', 'Método de obtención de tweets: api, scraping o mock')
      ON CONFLICT (config_key) DO NOTHING
    `);

    const statsRow = await pool.query('SELECT id FROM api_usage_stats WHERE id = 1');
    if (statsRow.rows.length === 0) {
      await pool.query(`
        INSERT INTO api_usage_stats (id, total_requests, successful_requests, failed_requests)
        VALUES (1, 0, 0, 0)
      `);
    }

    await createDefaultAdmin();
    await createDefaultTagsAndSources(pool);

    console.log('✅ Tablas de base de datos creadas/verificadas');
  } catch (error) {
    console.error('❌ Error creando tablas:', error.message);
    throw error;
  }
}

async function createDefaultAdmin() {
  try {
    const db = getDatabase();
    const [users] = await db.execute('SELECT id FROM users WHERE role = ?', ['admin']);
    if (users.length === 0) {
      const bcrypt = await import('bcrypt');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await db.execute(
        `INSERT INTO users (username, email, password_hash, role, is_active, approval_status)
         VALUES (?, ?, ?, ?, ?, ?)`,
        ['admin', 'admin@movilidad.com', hashedPassword, 'admin', true, 'active']
      );
      console.log('✅ Usuario admin creado (admin/admin123)');
    } else {
      await db.execute(
        `UPDATE users SET approval_status = 'active', is_active = TRUE
         WHERE role = 'admin' AND (approval_status != 'active' OR is_active = FALSE)`
      );
      console.log('✅ Admins existentes con approval_status = active');
    }
  } catch (error) {
    console.error('Error creando admin por defecto:', error.message);
  }
}

async function createDefaultTagsAndSources(pool) {
  try {
    const defaultTags = [
      { name: 'movilidad', description: 'Problemas de movilidad en general', color: '#1a73e8' },
      { name: 'transmilenio', description: 'Información relacionada con TransMilenio', color: '#ea4335' },
      { name: 'accidentes', description: 'Accidentes de tránsito', color: '#fbbc04' },
      { name: 'manifestaciones', description: 'Manifestaciones y bloqueos', color: '#34a853' },
      { name: 'obras', description: 'Obras y mantenimiento vial', color: '#ff6d01' },
      { name: 'desvíos', description: 'Desvíos y cierres viales', color: '#9c27b0' },
    ];

    for (const tag of defaultTags) {
      await pool.query(
        `INSERT INTO tags (name, description, color) VALUES ($1, $2, $3) ON CONFLICT (name) DO NOTHING`,
        [tag.name, tag.description, tag.color]
      );
    }

    const defaultSources = [
      {
        name: '@SectorMovilidad',
        type: 'twitter',
        identifier: 'SectorMovilidad',
        tags: ['movilidad', 'manifestaciones', 'obras', 'desvíos'],
      },
      {
        name: '@BogotaTransito',
        type: 'twitter',
        identifier: 'BogotaTransito',
        tags: ['movilidad', 'accidentes', 'desvíos'],
      },
      {
        name: '@TransMilenio',
        type: 'twitter',
        identifier: 'TransMilenio',
        tags: ['transmilenio', 'movilidad', 'desvíos'],
      },
      {
        name: 'bogota.gov.co',
        type: 'web',
        identifier:
          'https://bogota.gov.co/mi-ciudad/movilidad/en-vivo-movilidad-bogota-y-rutas-transmilenio',
        tags: ['movilidad', 'transmilenio', 'manifestaciones', 'obras'],
      },
    ];

    for (const source of defaultSources) {
      await pool.query(
        `INSERT INTO sources (name, type, identifier, description, is_active)
         VALUES ($1, $2, $3, $4, $5) ON CONFLICT (identifier) DO NOTHING`,
        [source.name, source.type, source.identifier, `Fuente oficial de ${source.name}`, true]
      );

      const r = await pool.query('SELECT id FROM sources WHERE identifier = $1', [source.identifier]);
      if (r.rows.length === 0) continue;
      const sourceId = r.rows[0].id;

      for (const tagName of source.tags) {
        const tr = await pool.query('SELECT id FROM tags WHERE name = $1', [tagName]);
        if (tr.rows.length === 0) continue;
        await pool.query(
          `INSERT INTO source_tags (source_id, tag_id) VALUES ($1, $2) ON CONFLICT (source_id, tag_id) DO NOTHING`,
          [sourceId, tr.rows[0].id]
        );
      }
    }

    console.log('✅ Tags y fuentes iniciales creados');
  } catch (error) {
    console.error('Error creando tags y fuentes iniciales:', error.message);
  }
}
