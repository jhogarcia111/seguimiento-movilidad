import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function testConnection() {
  console.log('🔍 Probando conexión a MySQL/MariaDB...\n');

  const config = {
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'wcdmocol',
    database: process.env.DB_NAME || 'seguimiento_movilidad',
  };

  console.log('📋 Configuración de conexión:');
  console.log(`   Host: ${config.host}`);
  console.log(`   Puerto: ${config.port}`);
  console.log(`   Usuario: ${config.user}`);
  console.log(`   Base de datos: ${config.database}`);
  console.log('   Contraseña: ********\n');

  let connection = null;

  try {
    // Intentar conectar sin especificar base de datos primero
    console.log('1️⃣ Intentando conectar al servidor...');
    connection = await mysql.createConnection({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
    });

    console.log('✅ Conexión al servidor MySQL/MariaDB exitosa!\n');

    // Verificar si la base de datos existe
    console.log('2️⃣ Verificando si la base de datos existe...');
    const [databases] = await connection.execute(
      `SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = ?`,
      [config.database]
    );

    if (databases.length === 0) {
      console.log(`⚠️  La base de datos "${config.database}" no existe.`);
      console.log(`📝 Creando base de datos...`);
      
      await connection.execute(
        `CREATE DATABASE IF NOT EXISTS ${config.database} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
      );
      console.log(`✅ Base de datos "${config.database}" creada exitosamente!\n`);
    } else {
      console.log(`✅ Base de datos "${config.database}" existe.\n`);
    }

    await connection.end();

    // Ahora conectar a la base de datos específica
    console.log('3️⃣ Conectando a la base de datos específica...');
    connection = await mysql.createConnection({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database,
    });

    console.log(`✅ Conexión a "${config.database}" exitosa!\n`);

    // Verificar tablas
    console.log('4️⃣ Verificando tablas...');
    const [tables] = await connection.execute(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ?`,
      [config.database]
    );

    if (tables.length === 0) {
      console.log('⚠️  No hay tablas en la base de datos.');
      console.log('💡 Las tablas se crearán automáticamente al iniciar el servidor.\n');
    } else {
      console.log(`✅ Se encontraron ${tables.length} tabla(s):`);
      tables.forEach(table => {
        console.log(`   - ${table.TABLE_NAME}`);
      });
      console.log();
    }

    // Prueba de query simple
    console.log('5️⃣ Probando query simple...');
    const [result] = await connection.execute('SELECT 1 as test');
    if (result[0].test === 1) {
      console.log('✅ Query de prueba exitosa!\n');
    }

    // Información del servidor
    console.log('6️⃣ Información del servidor:');
    const [serverInfo] = await connection.execute('SELECT VERSION() as version, DATABASE() as `database`');
    console.log(`   Versión: ${serverInfo[0].version}`);
    console.log(`   Base de datos actual: ${serverInfo[0].database || 'N/A'}\n`);

    await connection.end();

    console.log('========================================');
    console.log('✅ ¡CONEXIÓN EXITOSA!');
    console.log('========================================');
    console.log('🎉 Todo está configurado correctamente.');
    console.log('💡 Puedes iniciar el servidor con: npm run dev\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ ERROR DE CONEXIÓN:');
    console.error('========================================');
    console.error(`Tipo: ${error.name}`);
    console.error(`Mensaje: ${error.message}`);
    console.error('========================================\n');

    // Mensajes de ayuda específicos
    if (error.code === 'ECONNREFUSED') {
      console.log('💡 Solución: Asegúrate de que MySQL/MariaDB esté corriendo.');
      console.log('   En Windows: Verifica el servicio MySQL en Servicios.');
      console.log('   En Linux/Mac: sudo systemctl start mysql\n');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log('💡 Solución: Verifica usuario y contraseña en backend/.env');
      console.log('   Usuario actual: ' + config.user);
      console.log('   Host: ' + config.host + '\n');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.log(`💡 Solución: La base de datos "${config.database}" no existe.`);
      console.log('   Se intentará crear automáticamente al iniciar el servidor.\n');
    }

    if (connection) {
      await connection.end();
    }

    process.exit(1);
  }
}

// Ejecutar prueba
testConnection();
