import { initDatabase, getDatabase } from '../src/database/db.js';

async function addUniqueConstraint() {
  try {
    await initDatabase();
    const pool = getDatabase();

    console.log('🔍 Verificando si existe UNIQUE constraint en identifier...\n');

    // Verificar si ya existe
    const [indexes] = await pool.execute(`
      SHOW INDEXES FROM sources WHERE Column_name = 'identifier'
    `);

    const hasUnique = indexes.some(idx => idx.Non_unique === 0 && idx.Key_name !== 'PRIMARY');

    if (hasUnique) {
      console.log('✅ Ya existe un UNIQUE constraint en identifier');
      return;
    }

    // Primero verificar si hay duplicados
    const [duplicates] = await pool.execute(`
      SELECT identifier, COUNT(*) as count
      FROM sources
      GROUP BY identifier
      HAVING count > 1
    `);

    if (duplicates.length > 0) {
      console.error('❌ Error: Hay duplicados en la tabla. Debes ejecutar fix-duplicate-sources.js primero');
      console.log('Duplicados encontrados:', duplicates);
      process.exit(1);
    }

    // Eliminar el índice existente si hay
    try {
      await pool.execute('ALTER TABLE sources DROP INDEX idx_identifier');
      console.log('✅ Índice idx_identifier eliminado');
    } catch (error) {
      // El índice puede no existir, está bien
      console.log('ℹ️ No se encontró índice idx_identifier para eliminar');
    }

    // Agregar UNIQUE constraint
    await pool.execute(`
      ALTER TABLE sources 
      ADD UNIQUE INDEX idx_identifier_unique (identifier)
    `);

    console.log('✅ UNIQUE constraint agregado exitosamente en identifier');

    // Verificar
    const [newIndexes] = await pool.execute(`
      SHOW INDEXES FROM sources WHERE Column_name = 'identifier'
    `);

    const hasUniqueNow = newIndexes.some(idx => idx.Non_unique === 0 && idx.Key_name !== 'PRIMARY');
    
    if (hasUniqueNow) {
      console.log('✅ Verificación: UNIQUE constraint confirmado');
    } else {
      console.log('⚠️ Advertencia: No se pudo verificar el UNIQUE constraint');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code === 'ER_DUP_ENTRY') {
      console.error('   Hay valores duplicados. Ejecuta fix-duplicate-sources.js primero');
    }
    process.exit(1);
  }
}

addUniqueConstraint();
