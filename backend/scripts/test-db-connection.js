import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

async function testConnection() {
  console.log('🔍 Probando conexión a PostgreSQL (Neon)...\n');

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString || !connectionString.startsWith('postgres')) {
    console.error('❌ DATABASE_URL no está definida o no es postgresql://...');
    console.log('   Añade en backend/.env: DATABASE_URL=postgresql://...\n');
    process.exit(1);
  }

  const masked = connectionString.replace(/:[^:@]+@/, ':****@');
  console.log('📋 Cadena (enmascarada):', masked, '\n');

  const pool = new pg.Pool({ connectionString, max: 1 });

  try {
    const client = await pool.connect();
    try {
      console.log('1️⃣ Conexión al pool...');
      const v = await client.query('SELECT version() AS version, current_database() AS db');
      console.log('✅ Conectado');
      console.log(`   DB: ${v.rows[0].db}`);
      console.log(`   ${v.rows[0].version.split('\n')[0]}\n`);

      const tables = await client.query(`
        SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
        ORDER BY table_name
      `);
      console.log(`2️⃣ Tablas en public: ${tables.rows.length}`);
      tables.rows.forEach((r) => console.log(`   - ${r.table_name}`));
      console.log();
    } finally {
      client.release();
    }

    console.log('========================================');
    console.log('✅ CONEXIÓN EXITOSA');
    console.log('========================================');
    console.log('💡 Inicia el API con: npm run dev\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    if (error.code) console.error('   Código:', error.code);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

testConnection();
