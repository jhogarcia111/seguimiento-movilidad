import { initDatabase, getDatabase } from '../src/database/db.js';

async function cleanAllDuplicates() {
  try {
    await initDatabase();
    const pool = getDatabase();

    console.log('🔍 Verificando y limpiando TODOS los duplicados...\n');

    // Obtener todos los identifiers con sus IDs
    const [allSources] = await pool.execute(`
      SELECT identifier, COUNT(*)::int as count, string_agg(id::text, ',' ORDER BY id) as ids
      FROM sources
      GROUP BY identifier
      ORDER BY identifier
    `);

    console.log(`📊 Resumen de fuentes por identifier:\n`);
    
    let totalToDelete = 0;
    const duplicatesToFix = [];

    for (const source of allSources) {
      const ids = source.ids.split(',').map(id => parseInt(id));
      console.log(`${source.identifier}: ${source.count} copia(s) - IDs: ${source.ids}`);
      
      if (Number(source.count) > 1) {
        const keepId = ids[0]; // Mantener el ID más antiguo
        const deleteIds = ids.slice(1);
        duplicatesToFix.push({ identifier: source.identifier, keepId, deleteIds });
        totalToDelete += deleteIds.length;
      }
    }

    if (duplicatesToFix.length === 0) {
      console.log('\n✅ No hay duplicados. La base de datos está limpia.');
      process.exit(0);
    }

    console.log(`\n⚠️ Se encontraron ${duplicatesToFix.length} identifiers con duplicados`);
    console.log(`📉 Se eliminarán ${totalToDelete} fuentes duplicadas\n`);

    // Eliminar todos los duplicados
    for (const dup of duplicatesToFix) {
      console.log(`Procesando: ${dup.identifier}`);
      console.log(`  Mantener ID: ${dup.keepId}`);
      console.log(`  Eliminar IDs: ${dup.deleteIds.join(', ')}`);

      for (const deleteId of dup.deleteIds) {
        // Mover tags antes de eliminar
        const [tagsToMove] = await pool.execute(
          'SELECT tag_id FROM source_tags WHERE source_id = ?',
          [deleteId]
        );

        for (const tagRow of tagsToMove) {
          await pool.execute(`
            INSERT INTO source_tags (source_id, tag_id)
            VALUES (?, ?)
            ON CONFLICT (source_id, tag_id) DO NOTHING
          `, [dup.keepId, tagRow.tag_id]);
        }

        // Eliminar relaciones de tags
        await pool.execute('DELETE FROM source_tags WHERE source_id = ?', [deleteId]);
        
        // Eliminar la fuente
        await pool.execute('DELETE FROM sources WHERE id = ?', [deleteId]);
      }
      
      console.log(`  ✅ Completado\n`);
    }

    // Verificación final
    const [finalCount] = await pool.execute('SELECT COUNT(*) as total FROM sources');
    const [remainingDups] = await pool.execute(`
      SELECT identifier, COUNT(*)::int as count
      FROM sources
      GROUP BY identifier
      HAVING COUNT(*) > 1
    `);

    console.log('✅ Limpieza completada');
    console.log(`📊 Total de fuentes después de limpieza: ${Number(finalCount[0].total)}`);
    
    if (remainingDups.length === 0) {
      console.log('✅ Verificación: No quedan duplicados');
    } else {
      console.log(`⚠️ Aún quedan ${remainingDups.length} identifiers con duplicados`);
      remainingDups.forEach(d => console.log(`  ${d.identifier}: ${d.count} copias`));
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

cleanAllDuplicates();
