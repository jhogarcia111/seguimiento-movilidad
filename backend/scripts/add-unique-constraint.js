import { initDatabase, getDatabase } from '../src/database/db.js';

/**
 * En PostgreSQL, `sources.identifier` ya es UNIQUE en el esquema creado por db.js.
 * Este script solo verifica que exista la restricción.
 */
async function addUniqueConstraint() {
  try {
    await initDatabase();
    const pool = getDatabase();

    const [rows] = await pool.execute(`
      SELECT c.conname
      FROM pg_constraint c
      JOIN pg_class t ON c.conrelid = t.oid
      WHERE t.relname = 'sources'
        AND c.contype = 'u'
        AND pg_get_constraintdef(c.oid) LIKE '%identifier%'
    `);

    if (rows.length > 0) {
      console.log('✅ La tabla sources tiene restricción UNIQUE en identifier:', rows.map((r) => r.conname).join(', '));
    } else {
      console.log('⚠️ No se detectó UNIQUE en identifier. Revisa el esquema o añade:');
      console.log('   ALTER TABLE sources ADD CONSTRAINT sources_identifier_unique UNIQUE (identifier);');
    }
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

addUniqueConstraint();
