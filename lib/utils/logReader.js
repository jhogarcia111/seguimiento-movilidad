import { readFileSync, statSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Posibles rutas del archivo de log
const possibleLogPaths = [
  join(__dirname, '../../consola_backend.log'),
  join(__dirname, '../../../consola_backend.log'),
  join(process.cwd(), 'consola_backend.log'),
  join(process.cwd(), 'backend/consola_backend.log'),
  join(process.cwd(), 'backend/src/consola_backend.log')
];

let lastLogModificationTime = null;
let lastLogContent = '';

/**
 * Encuentra la ruta del archivo de log
 */
function findLogFilePath() {
  for (const path of possibleLogPaths) {
    try {
      const stats = statSync(path);
      if (stats.isFile()) {
        return path;
      }
    } catch (error) {
      // Continuar buscando
    }
  }
  return null;
}

/**
 * Lee el archivo de log del backend
 * @returns {Object} { content: string, modified: boolean, mtime: Date }
 */
export function readBackendLog() {
  try {
    const logFilePath = findLogFilePath();
    if (!logFilePath) {
      return { content: '', modified: false, mtime: null, path: null };
    }

    const stats = statSync(logFilePath);
    const currentMtime = stats.mtime.getTime();
    
    // Verificar si el archivo ha sido modificado
    const isModified = lastLogModificationTime === null || currentMtime !== lastLogModificationTime;
    
    if (isModified) {
      // Leer el contenido del archivo
      const content = readFileSync(logFilePath, 'utf-8');
      lastLogContent = content;
      lastLogModificationTime = currentMtime;
      
      return {
        content: content,
        modified: true,
        mtime: stats.mtime,
        path: logFilePath
      };
    }
    
    return {
      content: lastLogContent,
      modified: false,
      mtime: stats.mtime,
      path: logFilePath
    };
  } catch (error) {
    console.error('Error leyendo archivo de log:', error.message);
    return { content: '', modified: false, mtime: null, path: null, error: error.message };
  }
}

/**
 * Obtiene las últimas N líneas del log
 * @param {number} lines - Número de líneas a obtener
 * @returns {string}
 */
export function getLastLogLines(lines = 100) {
  const logData = readBackendLog();
  if (!logData.content) {
    return '';
  }
  
  const allLines = logData.content.split('\n');
  const lastLines = allLines.slice(-lines);
  return lastLines.join('\n');
}

/**
 * Busca patrones específicos en el log
 * @param {string|RegExp} pattern - Patrón a buscar
 * @returns {Array} Array de líneas que coinciden
 */
export function searchLog(pattern) {
  const logData = readBackendLog();
  if (!logData.content) {
    return [];
  }
  
  const lines = logData.content.split('\n');
  const regex = typeof pattern === 'string' ? new RegExp(pattern, 'i') : pattern;
  
  return lines.filter(line => regex.test(line));
}


