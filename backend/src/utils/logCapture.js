/**
 * Sistema de captura de logs en tiempo real
 * Intercepta console.log, console.error, etc. y los almacena en memoria
 * para luego enviarlos al frontend y guardarlos en archivo
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Guardar referencias originales ANTES de cualquier otra cosa
// Esto es crítico para evitar recursión infinita
const originalConsoleLog = console.log.bind(console);
const originalConsoleError = console.error.bind(console);
const originalConsoleWarn = console.warn.bind(console);
const originalConsoleInfo = console.info.bind(console);

// Buffer en memoria para almacenar logs
const logBuffer = [];
const MAX_BUFFER_SIZE = 1000; // Máximo de logs en memoria

// Stream para escribir al archivo
let logFileStream = null;
let logFilePath = null;

// Determinar ruta del archivo de log
function getLogFilePath() {
  const possiblePaths = [
    path.join(__dirname, '../../consola_backend.log'),
    path.join(__dirname, '../../../consola_backend.log'),
    path.join(process.cwd(), 'consola_backend.log'),
  ];

  for (const p of possiblePaths) {
    const dir = path.dirname(p);
    try {
      if (fs.existsSync(dir)) {
        return p;
      }
    } catch (e) {
      // Continuar
    }
  }
  return possiblePaths[0];
}

// Inicializar stream de archivo
function initLogFileStream() {
  if (!logFileStream) {
    logFilePath = getLogFilePath();
    try {
      // Crear stream en modo append
      logFileStream = fs.createWriteStream(logFilePath, { flags: 'a' });
      logFileStream.on('error', (err) => {
        // Usar el console.error original para evitar recursión
        originalConsoleError('Error escribiendo al archivo de log:', err);
      });
    } catch (error) {
      // Usar el console.error original para evitar recursión
      originalConsoleError('Error inicializando stream de log:', error);
    }
  }
}

// Formatear mensaje de log
function formatLogMessage(level, args) {
  const timestamp = new Date().toISOString();
  const message = args.map(arg => {
    if (typeof arg === 'object') {
      try {
        return JSON.stringify(arg);
      } catch {
        return String(arg);
      }
    }
    return String(arg);
  }).join(' ');

  return {
    id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp,
    level,
    content: message,
    raw: `[${timestamp}] [${level.toUpperCase()}] ${message}`
  };
}

// Guardar log en buffer y archivo
function saveLog(logEntry) {
  try {
    // Agregar al buffer
    logBuffer.push(logEntry);
    
    // Limitar tamaño del buffer
    if (logBuffer.length > MAX_BUFFER_SIZE) {
      logBuffer.shift(); // Eliminar el más antiguo
    }

    // Escribir al archivo
    if (logFileStream) {
      logFileStream.write(logEntry.raw + '\n', (err) => {
        if (err) {
          // Usar originalConsoleError para evitar recursión
          originalConsoleError('Error escribiendo log al archivo:', err);
        }
      });
    }
  } catch (err) {
    // Si hay error, usar originalConsoleError para evitar recursión
    originalConsoleError('Error en saveLog:', err);
  }
}

// Inicializar stream ANTES de interceptar para tener originalConsoleError disponible
try {
  initLogFileStream();
} catch (err) {
  // Si hay error al inicializar, no fallar - solo usar console original
  originalConsoleError('Error inicializando logCapture:', err);
}

// Interceptar console.log
console.log = function(...args) {
  try {
    const logEntry = formatLogMessage('info', args);
    saveLog(logEntry);
  } catch (err) {
    // Si hay error al guardar, no fallar - continuar con log original
  }
  try {
    originalConsoleLog(...args);
  } catch (err) {
    // Si hay error con el log original, ignorar
  }
};

// Interceptar console.error
console.error = function(...args) {
  try {
    const logEntry = formatLogMessage('error', args);
    saveLog(logEntry);
  } catch (err) {
    // Si hay error al guardar, no fallar - continuar con error original
  }
  try {
    originalConsoleError(...args);
  } catch (err) {
    // Si hay error con el error original, ignorar
  }
};

// Interceptar console.warn
console.warn = function(...args) {
  try {
    const logEntry = formatLogMessage('warn', args);
    saveLog(logEntry);
  } catch (err) {
    // Si hay error al guardar, no fallar - continuar con warn original
  }
  try {
    originalConsoleWarn(...args);
  } catch (err) {
    // Si hay error con el warn original, ignorar
  }
};

// Interceptar console.info
console.info = function(...args) {
  try {
    const logEntry = formatLogMessage('info', args);
    saveLog(logEntry);
  } catch (err) {
    // Si hay error al guardar, no fallar - continuar con info original
  }
  try {
    originalConsoleInfo(...args);
  } catch (err) {
    // Si hay error con el info original, ignorar
  }
};

/**
 * Obtiene los logs del buffer
 * @param {number} limit - Número máximo de logs a retornar
 * @param {Date} since - Solo retornar logs desde esta fecha
 * @returns {Array} Array de logs
 */
export function getLogs(limit = 500, since = null) {
  let logs = [...logBuffer];
  
  // Filtrar por fecha si se proporciona
  if (since) {
    const sinceTime = new Date(since).getTime();
    logs = logs.filter(log => new Date(log.timestamp).getTime() >= sinceTime);
  }
  
  // Limitar cantidad
  if (limit && limit > 0) {
    logs = logs.slice(-limit);
  }
  
  return logs;
}

/**
 * Obtiene los logs más recientes desde una fecha
 * @param {Date} since - Fecha desde la cual obtener logs
 * @returns {Array} Array de logs
 */
export function getLogsSince(since) {
  if (!since) return getLogs();
  return getLogs(MAX_BUFFER_SIZE, since);
}

/**
 * Limpia el buffer de logs
 */
export function clearLogs() {
  logBuffer.length = 0;
}

/**
 * Inicializa el sistema de captura de logs
 */
export function initLogCapture() {
  // Ya se inicializó antes de interceptar
  originalConsoleLog('✅ Sistema de captura de logs inicializado');
}

// Inicializar automáticamente al importar (pero no llamar console.log aquí para evitar recursión)

