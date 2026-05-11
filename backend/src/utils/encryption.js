import crypto from 'crypto';

// Clave de encriptación - usar variable de entorno o generar una por defecto
// IMPORTANTE: En producción, esta clave debe estar en una variable de entorno segura
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const ALGORITHM = 'aes-256-gcm';

/**
 * Obtiene la clave de encriptación (32 bytes para AES-256)
 * @returns {Buffer} Clave de encriptación
 */
function getEncryptionKey() {
  // Si la clave es un hex string, convertirla a buffer
  if (typeof ENCRYPTION_KEY === 'string' && ENCRYPTION_KEY.length === 64) {
    return Buffer.from(ENCRYPTION_KEY, 'hex');
  }
  // Si no, usar la clave directamente como buffer (truncar o rellenar a 32 bytes)
  const key = Buffer.from(ENCRYPTION_KEY, 'utf8');
  if (key.length < 32) {
    // Rellenar con ceros si es muy corta
    return Buffer.concat([key, Buffer.alloc(32 - key.length)]);
  }
  return key.slice(0, 32);
}

/**
 * Encripta un texto usando AES-256-GCM
 * @param {string} text - Texto a encriptar
 * @returns {string} Texto encriptado en formato base64 (iv:authTag:encrypted)
 */
export function encrypt(text) {
  try {
    if (!text || typeof text !== 'string') {
      return text;
    }

    const key = getEncryptionKey();
    const iv = crypto.randomBytes(16); // Initialization Vector
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(text, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    const authTag = cipher.getAuthTag();

    // Retornar en formato: iv:authTag:encrypted (todo en base64)
    return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
  } catch (error) {
    console.error('Error encriptando texto:', error);
    throw error;
  }
}

/**
 * Desencripta un texto usando AES-256-GCM
 * @param {string} encryptedText - Texto encriptado en formato base64 (iv:authTag:encrypted)
 * @returns {string} Texto desencriptado
 */
export function decrypt(encryptedText) {
  try {
    if (!encryptedText || typeof encryptedText !== 'string') {
      return encryptedText;
    }

    // Verificar si el texto está encriptado (formato: iv:authTag:encrypted)
    if (!encryptedText.includes(':')) {
      // Si no tiene el formato de encriptación, retornar como está (texto plano)
      return encryptedText;
    }

    const parts = encryptedText.split(':');
    if (parts.length !== 3) {
      // Si no tiene el formato correcto, retornar como está (texto plano)
      return encryptedText;
    }

    const [ivBase64, authTagBase64, encrypted] = parts;
    const key = getEncryptionKey();
    const iv = Buffer.from(ivBase64, 'base64');
    const authTag = Buffer.from(authTagBase64, 'base64');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('Error desencriptando texto:', error);
    // Si hay error al desencriptar, retornar el texto original (puede ser texto plano)
    return encryptedText;
  }
}

/**
 * Verifica si un texto está encriptado
 * @param {string} text - Texto a verificar
 * @returns {boolean} true si está encriptado
 */
export function isEncrypted(text) {
  if (!text || typeof text !== 'string') {
    return false;
  }
  // Verificar si tiene el formato de encriptación (iv:authTag:encrypted)
  return text.includes(':') && text.split(':').length === 3;
}

