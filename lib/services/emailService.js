import nodemailer from 'nodemailer';


// Configuración del transporter de email
const createTransporter = async () => {
  // Si hay configuración SMTP en .env, usarla
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    console.log('📧 Usando configuración SMTP personalizada');
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true', // true para 465, false para otros puertos
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  // Si no hay configuración, usar ethereal.email para pruebas
  // NOTA: Ethereal.email genera credenciales temporales que solo funcionan en desarrollo
  console.log('⚠️ No hay configuración SMTP. Usando ethereal.email (solo para desarrollo)');
  console.log('⚠️ Para producción, configura SMTP_HOST, SMTP_USER y SMTP_PASS en .env');
  
  // Crear cuenta temporal en ethereal.email
  const testAccount = await nodemailer.createTestAccount();
  
  return nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass
    }
  });
};

/**
 * Genera el HTML del email de bienvenida (registro recibido)
 */
function generateRegistrationEmailHTML(username, email) {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bienvenido a Transito Tito</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f4f4f4;
    }
    .container {
      background-color: #ffffff;
      border-radius: 12px;
      padding: 30px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .header h1 {
      color: #1a73e8;
      margin: 0;
      font-size: 28px;
    }
    .header .subtitle {
      color: #666;
      font-size: 16px;
      margin-top: 5px;
    }
    .emoji {
      font-size: 48px;
      margin-bottom: 20px;
    }
    .success-badge {
      background-color: #d4edda;
      border: 2px solid #28a745;
      border-radius: 8px;
      padding: 15px;
      margin: 20px 0;
      text-align: center;
    }
    .success-badge h2 {
      color: #28a745;
      margin: 0;
      font-size: 20px;
    }
    .content {
      margin: 20px 0;
    }
    .content p {
      margin-bottom: 15px;
      color: #555;
    }
    .benefits {
      background-color: #f8f9fa;
      border-radius: 8px;
      padding: 20px;
      margin: 20px 0;
    }
    .benefits h3 {
      color: #1a73e8;
      margin-top: 0;
    }
    .benefits ul {
      list-style: none;
      padding: 0;
    }
    .benefits li {
      padding: 10px 0;
      border-bottom: 1px solid #e0e0e0;
    }
    .benefits li:last-child {
      border-bottom: none;
    }
    .benefit-icon {
      font-size: 20px;
      margin-right: 10px;
    }
    .wait-message {
      background-color: #fff3cd;
      border-left: 4px solid #ffc107;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e0e0e0;
      color: #666;
      font-size: 14px;
    }
    .signature {
      margin-top: 20px;
      text-align: center;
      font-style: italic;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="emoji">🚦</div>
      <h1>Transito Tito</h1>
      <p class="subtitle">Seguimiento a la movilidad</p>
    </div>

    <div class="success-badge">
      <h2>✅ ¡Inscripción Recibida!</h2>
    </div>

    <div class="content">
      <p>¡Hola <strong>${username}</strong>! 👋</p>
      
      <p>Tu solicitud de registro ha sido recibida exitosamente. Estamos validando tu información y te notificaremos cuando tu cuenta esté activa.</p>
    </div>

    <div class="benefits">
      <h3>🌟 ¡Bienvenido a Transito Tito! 🌟</h3>
      <p>Soy <strong>Tito</strong>, tu asistente virtual para el seguimiento de movilidad en Bogotá. Una vez que tu cuenta sea aprobada, podrás disfrutar de:</p>
      <ul>
        <li><span class="benefit-icon">🔍</span> <strong>Búsqueda por Sector:</strong> Encuentra problemas de movilidad en cualquier zona de Bogotá</li>
        <li><span class="benefit-icon">⏱️</span> <strong>Información en Tiempo Real:</strong> Datos actualizados cada 30 minutos</li>
        <li><span class="benefit-icon">📱</span> <strong>Historial de Búsquedas:</strong> Guarda tus consultas anteriores</li>
        <li><span class="benefit-icon">🚦</span> <strong>Asistente Personal:</strong> Te guiaré en cada paso de tu experiencia</li>
      </ul>
    </div>

    <div class="wait-message">
      <p><strong>⏳ Por favor, espera a que nuestro equipo valide tu solicitud.</strong></p>
      <p>Te notificaremos por email cuando tu cuenta esté lista para usar.</p>
    </div>

    <div class="signature">
      <p>Con cariño,<br><strong>Transito - Tito</strong> 🚦</p>
    </div>

    <div class="footer">
      <p>Este es un email automático. Por favor, no respondas a este mensaje.</p>
      <p>&copy; ${new Date().getFullYear()} Transito Tito - Seguimiento a la movilidad</p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Genera el HTML del email de activación de cuenta
 */
function generateActivationEmailHTML(username, email) {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>¡Tu cuenta ha sido activada! - Transito Tito</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f4f4f4;
    }
    .container {
      background-color: #ffffff;
      border-radius: 12px;
      padding: 30px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .header h1 {
      color: #1a73e8;
      margin: 0;
      font-size: 28px;
    }
    .header .subtitle {
      color: #666;
      font-size: 16px;
      margin-top: 5px;
    }
    .emoji {
      font-size: 48px;
      margin-bottom: 20px;
    }
    .success-badge {
      background-color: #d4edda;
      border: 2px solid #28a745;
      border-radius: 8px;
      padding: 20px;
      margin: 20px 0;
      text-align: center;
    }
    .success-badge h2 {
      color: #28a745;
      margin: 0;
      font-size: 24px;
    }
    .content {
      margin: 20px 0;
    }
    .content p {
      margin-bottom: 15px;
      color: #555;
    }
    .cta-button {
      display: block;
      width: 200px;
      margin: 30px auto;
      padding: 15px 30px;
      background-color: #1a73e8;
      color: #ffffff;
      text-decoration: none;
      border-radius: 8px;
      text-align: center;
      font-weight: bold;
      font-size: 16px;
      transition: background-color 0.3s;
    }
    .cta-button:hover {
      background-color: #1557b0;
    }
    .features {
      background-color: #f8f9fa;
      border-radius: 8px;
      padding: 20px;
      margin: 20px 0;
    }
    .features h3 {
      color: #1a73e8;
      margin-top: 0;
    }
    .features ul {
      list-style: none;
      padding: 0;
    }
    .features li {
      padding: 10px 0;
      border-bottom: 1px solid #e0e0e0;
    }
    .features li:last-child {
      border-bottom: none;
    }
    .feature-icon {
      font-size: 20px;
      margin-right: 10px;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e0e0e0;
      color: #666;
      font-size: 14px;
    }
    .signature {
      margin-top: 20px;
      text-align: center;
      font-style: italic;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="emoji">🎉</div>
      <h1>Transito Tito</h1>
      <p class="subtitle">Seguimiento a la movilidad</p>
    </div>

    <div class="success-badge">
      <h2>✅ ¡Tu cuenta ha sido activada!</h2>
    </div>

    <div class="content">
      <p>¡Hola <strong>${username}</strong>! 👋</p>
      
      <p>¡Excelentes noticias! Tu cuenta ha sido activada exitosamente. Ahora puedes acceder a todas las funcionalidades de <strong>Transito Tito</strong>.</p>
    </div>

    <div class="features">
      <h3>🚀 ¡Comienza a usar la aplicación!</h3>
      <p>Ahora que tu cuenta está activa, puedes:</p>
      <ul>
        <li><span class="feature-icon">🔍</span> <strong>Buscar por Sector:</strong> Encuentra problemas de movilidad en cualquier zona de Bogotá</li>
        <li><span class="feature-icon">📊</span> <strong>Ver Información en Tiempo Real:</strong> Datos actualizados cada 30 minutos</li>
        <li><span class="feature-icon">📱</span> <strong>Guardar tu Historial:</strong> Todas tus búsquedas quedan guardadas</li>
        <li><span class="feature-icon">🚦</span> <strong>Interactuar con Tito:</strong> Tu asistente virtual te guiará en cada paso</li>
      </ul>
    </div>

    <div style="text-align: center;">
      <a href="${process.env.FRONTEND_URL || 'http://localhost:4051'}/login" class="cta-button">
        Iniciar Sesión
      </a>
    </div>

    <div class="signature">
      <p>¡Esperamos verte pronto!<br><strong>Transito - Tito</strong> 🚦</p>
    </div>

    <div class="footer">
      <p>Este es un email automático. Por favor, no respondas a este mensaje.</p>
      <p>&copy; ${new Date().getFullYear()} Transito Tito - Seguimiento a la movilidad</p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Envía email de bienvenida cuando un usuario se registra
 */
export async function sendRegistrationEmail(username, email) {
  try {
    const transporter = await createTransporter();
    
    const mailOptions = {
      from: process.env.SMTP_FROM || 'noreply@transitotito.com',
      to: email,
      subject: '✅ Inscripción Recibida - Transito Tito',
      html: generateRegistrationEmailHTML(username, email),
      text: `¡Hola ${username}!\n\nTu solicitud de registro ha sido recibida exitosamente. Estamos validando tu información y te notificaremos cuando tu cuenta esté activa.\n\n¡Bienvenido a Transito Tito!\n\nTransito - Tito 🚦`
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email de registro enviado:', info.messageId);
    
    // Si se usó ethereal.email, mostrar URL de preview
    const hasSmtpConfig = process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS;
    if (!hasSmtpConfig) {
      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        console.log('📧 URL de preview del email:', previewUrl);
      }
    }
    
    return { success: true, messageId: info.messageId, previewUrl: nodemailer.getTestMessageUrl(info) };
  } catch (error) {
    console.error('❌ Error enviando email de registro:', error);
    // No lanzar error para no interrumpir el registro
    return { success: false, error: error.message };
  }
}

/**
 * Genera el HTML del email para administradores cuando hay un nuevo registro
 */
function generateNewUserNotificationEmailHTML(username, userEmail) {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nuevo Usuario Registrado - Transito Tito</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f4f4f4;
    }
    .container {
      background-color: #ffffff;
      border-radius: 12px;
      padding: 30px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .header h1 {
      color: #1a73e8;
      margin: 0;
      font-size: 28px;
    }
    .header .subtitle {
      color: #666;
      font-size: 16px;
      margin-top: 5px;
    }
    .emoji {
      font-size: 48px;
      margin-bottom: 20px;
    }
    .alert-badge {
      background-color: #fff3cd;
      border: 2px solid #ffc107;
      border-radius: 8px;
      padding: 15px;
      margin: 20px 0;
      text-align: center;
    }
    .alert-badge h2 {
      color: #856404;
      margin: 0;
      font-size: 20px;
    }
    .content {
      margin: 20px 0;
    }
    .content p {
      margin-bottom: 15px;
      color: #555;
    }
    .user-info {
      background-color: #f8f9fa;
      border-radius: 8px;
      padding: 20px;
      margin: 20px 0;
    }
    .user-info h3 {
      color: #1a73e8;
      margin-top: 0;
    }
    .user-info p {
      margin: 10px 0;
    }
    .user-info strong {
      color: #333;
    }
    .cta-button {
      display: block;
      width: 250px;
      margin: 30px auto;
      padding: 15px 30px;
      background-color: #1a73e8;
      color: #ffffff;
      text-decoration: none;
      border-radius: 8px;
      text-align: center;
      font-weight: bold;
      font-size: 16px;
      transition: background-color 0.3s;
    }
    .cta-button:hover {
      background-color: #1557b0;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e0e0e0;
      color: #666;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="emoji">🔔</div>
      <h1>Transito Tito</h1>
      <p class="subtitle">Panel de Administración</p>
    </div>

    <div class="alert-badge">
      <h2>⚠️ Nuevo Usuario Registrado</h2>
    </div>

    <div class="content">
      <p>Se ha registrado un nuevo usuario en <strong>Transito Tito</strong> que requiere tu atención.</p>
    </div>

    <div class="user-info">
      <h3>📋 Información del Usuario</h3>
      <p><strong>Usuario:</strong> ${username}</p>
      <p><strong>Email:</strong> ${userEmail}</p>
      <p><strong>Estado:</strong> <span style="color: #ffc107; font-weight: bold;">Pendiente de Aprobación</span></p>
    </div>

    <div style="text-align: center;">
      <a href="${process.env.FRONTEND_URL || 'http://localhost:4051'}/admin?tab=users" class="cta-button">
        Revisar Usuario
      </a>
    </div>

    <div class="footer">
      <p>Este es un email automático del sistema de administración.</p>
      <p>&copy; ${new Date().getFullYear()} Transito Tito - Seguimiento a la movilidad</p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Envía email cuando una cuenta es activada
 */
export async function sendActivationEmail(username, email) {
  try {
    console.log(`📧 Preparando email de activación para ${username} (${email})`);
    
    const transporter = await createTransporter();
    
    // Verificar configuración SMTP
    const hasSmtpConfig = process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS;
    if (!hasSmtpConfig) {
      console.warn('⚠️ No hay configuración SMTP en .env. Usando ethereal.email (modo prueba)');
      console.warn('⚠️ Los emails se crearán pero NO se enviarán realmente al destinatario.');
      console.warn('⚠️ Verás una URL de preview en la consola para ver el email.');
      console.warn('⚠️ Para producción, configura SMTP_HOST, SMTP_USER y SMTP_PASS en backend/.env');
    }
    
    const mailOptions = {
      from: process.env.SMTP_FROM || 'noreply@transitotito.com',
      to: email,
      subject: '🎉 ¡Tu cuenta ha sido activada! - Transito Tito',
      html: generateActivationEmailHTML(username, email),
      text: `¡Hola ${username}!\n\n¡Excelentes noticias! Tu cuenta ha sido activada exitosamente. Ahora puedes acceder a todas las funcionalidades de Transito Tito.\n\nInicia sesión en: ${process.env.FRONTEND_URL || 'http://localhost:4051'}/login\n\n¡Esperamos verte pronto!\n\nTransito - Tito 🚦`
    };

    console.log(`📧 Enviando email a: ${email}`);
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email de activación enviado exitosamente:', info.messageId);
    
    // Si se usó ethereal.email, mostrar URL de preview
    if (!hasSmtpConfig) {
      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        console.log('📧 URL de preview del email:', previewUrl);
        console.log('📧 Abre esta URL en tu navegador para ver el email que se habría enviado');
      }
    }
    
    return { success: true, messageId: info.messageId, previewUrl: nodemailer.getTestMessageUrl(info) };
  } catch (error) {
    console.error('❌ Error enviando email de activación:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      command: error.command,
      response: error.response
    });
    // No lanzar error para no interrumpir la activación
    return { success: false, error: error.message };
  }
}

/**
 * Envía email a todos los administradores cuando hay un nuevo registro
 */
export async function sendNewUserNotificationToAdmins(username, userEmail) {
  try {
    const { getDatabase } = await import('../database/db.js');
    const pool = getDatabase();
    
    // Obtener todos los administradores activos
    const [admins] = await pool.execute(
      `SELECT id, username, email FROM users WHERE role = 'admin' AND is_active = TRUE AND approval_status = 'active'`
    );

    if (admins.length === 0) {
      console.log('⚠️ No hay administradores activos para notificar');
      return { success: true, sent: 0 };
    }

    const transporter = await createTransporter();
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4051';
    
    // Enviar email a cada administrador
    const emailPromises = admins.map(async (admin) => {
      const mailOptions = {
        from: process.env.SMTP_FROM || 'noreply@transitotito.com',
        to: admin.email,
        subject: `🔔 Nuevo Usuario Registrado - ${username}`,
        html: generateNewUserNotificationEmailHTML(username, userEmail),
        text: `Hola ${admin.username},\n\nSe ha registrado un nuevo usuario en Transito Tito:\n\nUsuario: ${username}\nEmail: ${userEmail}\nEstado: Pendiente de Aprobación\n\nRevisa el usuario en: ${frontendUrl}/admin?tab=users\n\nEste es un email automático del sistema de administración.`
      };

      try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ Email de notificación enviado a admin ${admin.email}:`, info.messageId);
        return { success: true, adminEmail: admin.email, messageId: info.messageId };
      } catch (error) {
        console.error(`❌ Error enviando email a admin ${admin.email}:`, error);
        return { success: false, adminEmail: admin.email, error: error.message };
      }
    });

    const results = await Promise.all(emailPromises);
    const successful = results.filter(r => r.success).length;
    
    return { 
      success: true, 
      sent: successful, 
      total: admins.length,
      results 
    };
  } catch (error) {
    console.error('❌ Error enviando emails de notificación a administradores:', error);
    // No lanzar error para no interrumpir el registro
    return { success: false, error: error.message };
  }
}

