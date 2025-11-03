import { initDatabase, getDatabase } from '../src/database/db.js';

async function checkDuplicates() {
  try {
    await initDatabase();
    const pool = getDatabase();

    // Verificar duplicados por identifier
    const [duplicates] = await pool.execute(`
      SELECT identifier, COUNT(*) as count, GROUP_CONCAT(id) as ids
      FROM sources
      GROUP BY identifier
      HAVING count > 1
    `);

    if (duplicates.length === 0) {
      console.log('✅ No se encontraron duplicados en la tabla sources');
      return;
    }

    console.log(`⚠️ Se encontraron ${duplicates.length} identifiers duplicados:\n`);
    
    for (const dup of duplicates) {
      console.log(`Identifier: ${dup.identifier}`);
      console.log(`  Cantidad: ${dup.count}`);
      console.log(`  IDs: ${dup.ids}`);
      
      // Obtener todas las filas duplicadas
      const [rows] = await pool.execute(
        'SELECT id, name, type, identifier, is_active, created_at FROM sources WHERE identifier = ?',
        [dup.identifier]
      );
      
      console.log('  Filas:');
      rows.forEach(row => {
        console.log(`    ID: ${row.id}, Name: ${row.name}, Active: ${row.is_active}, Created: ${row.created_at}`);
      });
      console.log('');
    }

    // Verificar total de fuentes
    const [total] = await pool.execute('SELECT COUNT(*) as total FROM sources');
    console.log(`\nTotal de fuentes en la base de datos: ${total[0].total}`);

    // Contar únicas
    const [unique] = await pool.execute('SELECT COUNT(DISTINCT identifier) as unique_count FROM sources');
    console.log(`Identifiers únicos: ${unique[0].unique_count}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkDuplicates();
