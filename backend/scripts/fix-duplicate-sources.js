import { initDatabase, getDatabase } from '../src/database/db.js';

async function fixDuplicates() {
  try {
    await initDatabase();
    const pool = getDatabase();

    console.log('🔍 Buscando duplicados...\n');

    // Obtener duplicados
    const [duplicates] = await pool.execute(`
      SELECT identifier, COUNT(*) as count, GROUP_CONCAT(id ORDER BY id) as ids
      FROM sources
      GROUP BY identifier
      HAVING count > 1
    `);

    if (duplicates.length === 0) {
      console.log('✅ No se encontraron duplicados');
      return;
    }

    console.log(`⚠️ Se encontraron ${duplicates.length} identifiers duplicados\n`);

    for (const dup of duplicates) {
      const ids = dup.ids.split(',').map(id => parseInt(id));
      
      // Mantener el ID más antiguo (menor ID)
      const keepId = ids[0];
      const deleteIds = ids.slice(1);

      console.log(`Identifier: ${dup.identifier}`);
      console.log(`  Mantener ID: ${keepId}`);
      console.log(`  Eliminar IDs: ${deleteIds.join(', ')}`);

      // Obtener los tags de las fuentes que vamos a eliminar
      for (const deleteId of deleteIds) {
        // Mover los tags de la fuente que se elimina a la fuente que se mantiene
        const [tagsToMove] = await pool.execute(
          'SELECT tag_id FROM source_tags WHERE source_id = ?',
          [deleteId]
        );

        for (const tagRow of tagsToMove) {
          // Solo agregar si no existe ya en la fuente que se mantiene
          await pool.execute(`
            INSERT IGNORE INTO source_tags (source_id, tag_id)
            VALUES (?, ?)
          `, [keepId, tagRow.tag_id]);
        }

        // Eliminar relaciones de tags de la fuente que se elimina
        await pool.execute('DELETE FROM source_tags WHERE source_id = ?', [deleteId]);

        // Eliminar la fuente duplicada
        await pool.execute('DELETE FROM sources WHERE id = ?', [deleteId]);
        console.log(`  ✅ Eliminada fuente ID: ${deleteId}`);
      }

      console.log('');
    }

    console.log('✅ Duplicados eliminados exitosamente');

    // Verificar que no quedan duplicados
    const [remaining] = await pool.execute(`
      SELECT identifier, COUNT(*) as count
      FROM sources
      GROUP BY identifier
      HAVING count > 1
    `);

    if (remaining.length === 0) {
      console.log('✅ Verificación: No quedan duplicados');
    } else {
      console.log('⚠️ Aún quedan duplicados:', remaining);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

fixDuplicates();
