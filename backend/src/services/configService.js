import { getDatabase } from '../database/db.js';
import { encrypt, decrypt, isEncrypted } from '../utils/encryption.js';

// Lista de configuraciones sensibles que deben estar encriptadas
const SENSITIVE_KEYS = ['api_key', 'password', 'secret', 'token', 'credential'];

/**
 * Verifica si una clave de configuración es sensible (debe estar encriptada)
 * @param {string} configKey - Clave de configuración
 * @returns {boolean} true si es sensible
 */
function isSensitiveKey(configKey) {
  const keyLower = configKey.toLowerCase();
  return SENSITIVE_KEYS.some(sensitive => keyLower.includes(sensitive));
}

/**
 * Obtiene el valor de una configuración del sistema
 * @param {string} configKey - Clave de configuración
 * @param {any} defaultValue - Valor por defecto si no existe
 * @returns {Promise<any>} Valor de la configuración
 */
export async function getConfig(configKey, defaultValue = null) {
  try {
    const pool = getDatabase();
    const [rows] = await pool.execute(
      'SELECT config_value FROM system_config WHERE config_key = ?',
      [configKey]
    );

    if (rows && rows.length > 0) {
      let rawValue = rows[0].config_value;
      
      // Si es una clave sensible, intentar desencriptar
      if (isSensitiveKey(configKey) && isEncrypted(rawValue)) {
        try {
          rawValue = decrypt(rawValue);
          console.log(`🔓 Configuración sensible ${configKey} desencriptada correctamente`);
        } catch (error) {
          console.error(`⚠️ Error desencriptando ${configKey}:`, error.message);
          // Si falla la desencriptación, puede ser texto plano antiguo, continuar
        }
      }
      
      // Si el valor es un string que parece JSON (empieza con " o { o [), intentar parsear
      if (typeof rawValue === 'string' && (rawValue.trim().startsWith('"') || rawValue.trim().startsWith('{') || rawValue.trim().startsWith('['))) {
        try {
          const parsed = JSON.parse(rawValue);
          // Si el parseo resultó en un string (ej: JSON.stringify de un string), retornar el string sin comillas
          return typeof parsed === 'string' ? parsed : parsed;
        } catch (error) {
          // Si no es JSON válido, retornar como string
          return rawValue;
        }
      }
      
      // Si no parece JSON, retornar directamente como string
      return rawValue;
    }

    // Log si no se encuentra la configuración
    if (isSensitiveKey(configKey)) {
      console.log(`⚠️ Configuración sensible ${configKey} no encontrada en la base de datos`);
    }
    
    return defaultValue;
  } catch (error) {
    console.error(`Error obteniendo configuración ${configKey}:`, error);
    return defaultValue;
  }
}

/**
 * Establece el valor de una configuración del sistema
 * @param {string} configKey - Clave de configuración
 * @param {any} configValue - Valor a establecer (se serializa como JSON)
 * @param {string} description - Descripción de la configuración
 * @param {number} userId - ID del usuario que actualiza (opcional)
 * @returns {Promise<boolean>} true si se actualizó correctamente
 */
export async function setConfig(configKey, configValue, description = null, userId = null) {
  try {
    const pool = getDatabase();
    
    let valueStr;
    
    // Para strings simples (como API keys), guardar directamente sin JSON.stringify
    // Para objetos/arrays, usar JSON.stringify
    if (typeof configValue === 'string') {
      valueStr = configValue;
    } else {
      valueStr = JSON.stringify(configValue);
    }
    
    // Si es una clave sensible, encriptar el valor
    if (isSensitiveKey(configKey) && typeof configValue === 'string' && configValue.length > 0) {
      try {
        // Verificar si ya está encriptado (para evitar doble encriptación)
        if (!isEncrypted(valueStr)) {
          valueStr = encrypt(valueStr);
          console.log(`🔒 Configuración sensible ${configKey} encriptada antes de guardar`);
        } else {
          console.log(`ℹ️ Configuración sensible ${configKey} ya estaba encriptada`);
        }
      } catch (error) {
        console.error(`⚠️ Error encriptando ${configKey}:`, error.message);
        // Si falla la encriptación, guardar como texto plano (no ideal, pero mejor que perder el valor)
        console.warn(`⚠️ Guardando ${configKey} como texto plano debido a error de encriptación`);
      }
    }

    await pool.execute(`
      INSERT INTO system_config (config_key, config_value, description, updated_by)
      VALUES (?, ?, ?, ?)
      ON CONFLICT (config_key) DO UPDATE SET
        config_value = EXCLUDED.config_value,
        description = COALESCE(EXCLUDED.description, system_config.description),
        updated_by = EXCLUDED.updated_by,
        updated_at = CURRENT_TIMESTAMP
    `, [configKey, valueStr, description, userId]);

    const isSensitive = isSensitiveKey(configKey);
    console.log(`✅ Configuración ${configKey} actualizada${isSensitive ? ' (valor sensible encriptado)' : ''}`);
    
    // Verificar que se guardó correctamente
    const [verifyRows] = await pool.execute(
      'SELECT config_value FROM system_config WHERE config_key = ?',
      [configKey]
    );
    
    if (verifyRows && verifyRows.length > 0) {
      const savedValue = verifyRows[0].config_value;
      if (isSensitive) {
        if (isEncrypted(savedValue)) {
          console.log(`✅ Verificación: ${configKey} guardado correctamente (encriptado)`);
        } else {
          console.warn(`⚠️ Verificación: ${configKey} guardado pero NO está encriptado`);
        }
      }
    }
    
    return true;
  } catch (error) {
    console.error(`Error actualizando configuración ${configKey}:`, error);
    return false;
  }
}

/**
 * Obtiene todas las configuraciones del sistema
 * @returns {Promise<Object>} Objeto con todas las configuraciones
 */
export async function getAllConfig() {
  try {
    const pool = getDatabase();
    const [rows] = await pool.execute(
      'SELECT config_key, config_value, description, updated_at, updated_by FROM system_config'
    );

    const config = {};
    for (const row of rows) {
      let value = row.config_value;
      
      // Si es una clave sensible, intentar desencriptar
      if (isSensitiveKey(row.config_key) && isEncrypted(value)) {
        try {
          value = decrypt(value);
        } catch (error) {
          console.error(`⚠️ Error desencriptando ${row.config_key}:`, error.message);
          // Si falla, usar el valor encriptado (no ideal, pero mejor que nada)
        }
      }
      
      // Intentar parsear como JSON si parece JSON
      try {
        if (typeof value === 'string' && (value.trim().startsWith('"') || value.trim().startsWith('{') || value.trim().startsWith('['))) {
          const parsed = JSON.parse(value);
          value = typeof parsed === 'string' ? parsed : parsed;
        }
      } catch (error) {
        // Si no es JSON, usar el valor como está
      }
      
      config[row.config_key] = {
        value: value,
        description: row.description,
        updated_at: row.updated_at,
        updated_by: row.updated_by
      };
    }

    return config;
  } catch (error) {
    console.error('Error obteniendo todas las configuraciones:', error);
    return {};
  }
}

/**
 * Obtiene el método de obtención de tweets configurado
 * @returns {Promise<string>} 'api', 'scraping' o 'mock'
 */
export async function getTwitterDataSource() {
  return await getConfig('twitter_data_source', 'api'); // Por defecto usar 'api' (gratis: 100 posts/mes)
}

