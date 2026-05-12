import { getDatabase } from '../db/db.js';

/**
 * Obtiene fuentes activas filtradas por tags
 * @param {Array<string>} tags - Array de nombres de tags
 * @returns {Promise<Array>} Array de fuentes
 */
export async function getSourcesByTags(tags = []) {
  try {
    const pool = getDatabase();

    if (tags.length === 0) {
      const [sources] = await pool.execute(
        `SELECT s.*, 
         string_agg(t.name, ',' ORDER BY t.name) as tag_names
         FROM sources s
         LEFT JOIN source_tags st ON s.id = st.source_id
         LEFT JOIN tags t ON st.tag_id = t.id
         WHERE s.is_active = TRUE
         GROUP BY s.id
         ORDER BY s.name`
      );

      return sources.map((source) => ({
        ...source,
        tags: source.tag_names ? source.tag_names.split(',') : [],
      }));
    }

    const placeholders = tags.map(() => '?').join(', ');
    const [sources] = await pool.execute(
      `SELECT s.*, sub.tag_names
       FROM sources s
       INNER JOIN (
         SELECT st.source_id, string_agg(t.name, ',' ORDER BY t.name) AS tag_names
         FROM source_tags st
         INNER JOIN tags t ON st.tag_id = t.id
         WHERE t.name IN (${placeholders})
         GROUP BY st.source_id
       ) sub ON s.id = sub.source_id
       WHERE s.is_active = TRUE
       ORDER BY s.name`,
      tags
    );

    return sources.map((source) => ({
      ...source,
      tags: source.tag_names ? source.tag_names.split(',') : [],
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

    return sources.map((s) => s.identifier);
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
