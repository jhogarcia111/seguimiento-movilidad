import { getDatabase } from '../database/db.js';

/**
 * Obtiene fuentes activas filtradas por tags
 * @param {Array<string>} tags - Array de nombres de tags
 * @returns {Promise<Array>} Array de fuentes
 */
export async function getSourcesByTags(tags = []) {
  try {
    const pool = getDatabase();
    
    if (tags.length === 0) {
      // Si no hay tags, retornar todas las fuentes activas
      const [sources] = await pool.execute(
        `SELECT s.*, 
         GROUP_CONCAT(t.name) as tag_names
         FROM sources s
         LEFT JOIN source_tags st ON s.id = st.source_id
         LEFT JOIN tags t ON st.tag_id = t.id
         WHERE s.is_active = TRUE
         GROUP BY s.id
         ORDER BY s.name`
      );
      
      return sources.map(source => ({
        ...source,
        tags: source.tag_names ? source.tag_names.split(',') : []
      }));
    }

    // Buscar fuentes que tengan al menos uno de los tags
    const [sources] = await pool.execute(
      `SELECT DISTINCT s.*, 
       GROUP_CONCAT(DISTINCT t.name) as tag_names
       FROM sources s
       INNER JOIN source_tags st ON s.id = st.source_id
       INNER JOIN tags t ON st.tag_id = t.id
       WHERE s.is_active = TRUE 
         AND t.name IN (?)
       GROUP BY s.id
       ORDER BY s.name`,
      [tags]
    );

    return sources.map(source => ({
      ...source,
      tags: source.tag_names ? source.tag_names.split(',') : []
    }));
  } catch (error) {
    console.error('Error obteniendo fuentes por tags:', error);
    return [];
  }
}

/**
 * Obtiene todas las fuentes activas de Twitter
 */
export async function getTwitterSources() {
  try {
    const pool = getDatabase();
    const [sources] = await pool.execute(
      `SELECT identifier, name 
       FROM sources 
       WHERE type = 'twitter' AND is_active = TRUE`
    );
    
    return sources.map(s => s.identifier); // Retornar solo los identifiers
  } catch (error) {
    console.error('Error obteniendo fuentes Twitter:', error);
    return [];
  }
}

/**
 * Obtiene fuentes web activas
 */
export async function getWebSources() {
  try {
    const pool = getDatabase();
    const [sources] = await pool.execute(
      `SELECT identifier, name 
       FROM sources 
       WHERE type = 'web' AND is_active = TRUE`
    );
    
    return sources;
  } catch (error) {
    console.error('Error obteniendo fuentes web:', error);
    return [];
  }
}
