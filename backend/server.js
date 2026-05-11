import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import './src/utils/logCapture.js'; // Inicializar captura de logs
import mobilityRoutes from './src/routes/mobility.js';
import authRoutes from './src/routes/auth.js';
import adminRoutes from './src/routes/admin.js';
import userRoutes from './src/routes/user.js';
import testRoutes from './src/routes/test.js';
import { initDatabase } from './src/database/db.js';

// Cargar variables de entorno
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3051;

// Configuración de CORS para permitir localhost y URLs públicas de Cursor
// En desarrollo, permitimos todos los orígenes para facilitar el debugging
const isDevelopment = process.env.NODE_ENV !== 'production';

function extraOriginsFromEnv() {
  const raw = process.env.ALLOWED_ORIGINS || '';
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

// Función auxiliar para verificar si un origin está permitido
function isOriginAllowed(origin) {
  if (!origin) return true; // Permitir requests sin origin

  if (extraOriginsFromEnv().includes(origin)) {
    return true;
  }

  // Lista de orígenes permitidos (siempre permitidos)
  const alwaysAllowedOrigins = [
    // Localhost para desarrollo local
    'http://localhost:4051',
    'http://127.0.0.1:4051',
    // URLs públicas de Cursor (devtunnels.ms) - SIEMPRE permitidas
    /^https:\/\/.*\.devtunnels\.ms$/i,
    /^https:\/\/.*\.tunnels\.cursor\.com$/i,
    // Despliegues en Vercel (preview y producción en *.vercel.app)
    /^https:\/\/.*\.vercel\.app$/i,
  ];

  const isAlwaysAllowed = alwaysAllowedOrigins.some((allowedOrigin) => {
    if (allowedOrigin instanceof RegExp) {
      return allowedOrigin.test(origin);
    }
    return allowedOrigin === origin;
  });

  if (isAlwaysAllowed) {
    return true;
  }

  // En desarrollo, permitir todos los demás orígenes
  if (isDevelopment) {
    return true;
  }

  // En producción, solo los de la lista están permitidos
  return false;
}

const corsOptions = {
  origin: function (origin, callback) {
    // Usar la función auxiliar para verificar
    if (isOriginAllowed(origin)) {
      callback(null, true);
    } else {
      console.log('⚠️ CORS bloqueado para origin:', origin);
      callback(null, false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'Cache-Control'],
  exposedHeaders: ['Content-Type'],
  optionsSuccessStatus: 200, // Algunos navegadores antiguos (IE11, varios SmartTVs) se cuelgan con 204
  preflightContinue: false, // Asegurar que preflight termine inmediatamente
};

// Middlewares - OPTIONS DEBE ir PRIMERO, ANTES de CORS
// Manejar peticiones OPTIONS explícitamente (preflight) ANTES de todo
app.options('*', (req, res) => {
  const origin = req.headers.origin;
  // No loggear Preflight OPTIONS para reducir ruido en logs
  
  // Verificar si el origin está permitido
  if (isOriginAllowed(origin)) {
    // Establecer headers manualmente solo si el origin está permitido
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, Cache-Control');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Max-Age', '86400'); // 24 horas
    res.status(200).end();
  } else {
    console.log('⚠️ Preflight OPTIONS bloqueado para origin:', origin);
    res.status(403).end();
  }
});

// Después aplicar CORS a todas las demás rutas
app.use(cors(corsOptions));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging básico (solo para rutas importantes, no para logs/admin/notifications)
app.use((req, res, next) => {
  // No loggear requests de logs, notifications, o health checks para reducir ruido
  if (!req.path.includes('/api/admin/logs') && 
      !req.path.includes('/api/admin/notifications') && 
      !req.path.includes('/health')) {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  }
  next();
});

// Inicializar base de datos (async)
initDatabase().catch(error => {
  console.error('❌ Error crítico inicializando base de datos:', error);
  process.exit(1);
});

// Rutas públicas
app.use('/api/auth', authRoutes);

// Rutas de movilidad (públicas por ahora, pero pueden requerir auth)
app.use('/api/mobility', mobilityRoutes);

// Rutas protegidas - Admin
app.use('/api/admin', adminRoutes);

// Rutas protegidas - Usuario
app.use('/api/user', userRoutes);

// Rutas protegidas - Pruebas
app.use('/api/test', testRoutes);

// Ruta de salud
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'Seguimiento Movilidad API'
  });
});

// Ruta de prueba de CORS
app.get('/api/test-cors', (req, res) => {
  console.log('✅ Test CORS - Origin:', req.headers.origin);
  res.json({ 
    status: 'ok', 
    message: 'CORS funcionando correctamente',
    origin: req.headers.origin,
    timestamp: new Date().toISOString()
  });
});

// Ruta de prueba de CORS con POST
app.post('/api/test-cors', (req, res) => {
  console.log('✅ Test CORS POST - Origin:', req.headers.origin);
  res.json({ 
    status: 'ok', 
    message: 'CORS POST funcionando correctamente',
    origin: req.headers.origin,
    body: req.body,
    timestamp: new Date().toISOString()
  });
});

// Manejo de errores
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Error interno del servidor',
    timestamp: new Date().toISOString()
  });
});

// Iniciar servidor - Escuchar en todas las interfaces para permitir acceso desde la red local
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
  console.log(`🌐 Servidor accesible desde la red local en http://0.0.0.0:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
});
