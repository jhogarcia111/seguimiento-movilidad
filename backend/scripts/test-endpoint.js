import { initDatabase, getDatabase } from '../src/database/db.js';

async function testEndpoint() {
  try {
    await initDatabase();
    const pool = getDatabase();
    
    // Simular exactamente el query del endpoint
    const [sources] = await pool.execute(`
      SELECT s.*, 
             string_agg(
               concat(t.id::text, ':', t.name, ':', t.color),
               ','
               ORDER BY t.name
             ) as tags
      FROM sources s
      LEFT JOIN source_tags st ON s.id = st.source_id
      LEFT JOIN tags t ON st.tag_id = t.id
      GROUP BY s.id
      ORDER BY s.name
    `);

    console.log(`\n📊 Total de fuentes devueltas por el query: ${sources.length}\n`);
    
    if (sources.length > 4) {
      console.log('⚠️ PROBLEMA: Hay más de 4 fuentes (deberían ser solo 4)\n');
    } else {
      console.log('✅ Cantidad correcta de fuentes\n');
    }

    console.log('📋 Detalles de cada fuente:');
    sources.forEach((s, idx) => {
      console.log(`\n${idx + 1}. ID: ${s.id}`);
      console.log(`   Name: ${s.name}`);
      console.log(`   Identifier: ${s.identifier}`);
      console.log(`   Type: ${s.type}`);
      console.log(`   Active: ${s.is_active ? 'Sí' : 'No'}`);
      console.log(`   Tags: ${s.tags || 'Sin tags'}`);
    });

    // Verificar duplicados por identifier
    const identifiers = sources.map(s => s.identifier);
    const uniqueIdentifiers = [...new Set(identifiers)];
    
    console.log(`\n📊 Análisis:`);
    console.log(`   Identifiers únicos: ${uniqueIdentifiers.length}`);
    console.log(`   Total de fuentes: ${identifiers.length}`);
    
    if (identifiers.length !== uniqueIdentifiers.length) {
      console.log('\n⚠️ PROBLEMA: Hay fuentes duplicadas por identifier:');
      identifiers.forEach((id, idx) => {
        if (identifiers.indexOf(id) !== idx) {
          console.log(`   - ${id} aparece múltiples veces`);
        }
      });
    } else {
      console.log('   ✅ No hay duplicados por identifier');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

testEndpoint();
