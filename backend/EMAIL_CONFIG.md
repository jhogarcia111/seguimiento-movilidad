# 📧 Configuración de Email

## Configuración SMTP

Para enviar emails reales, configura las siguientes variables en `backend/.env`:

```env
# Configuración SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=tu-email@gmail.com
SMTP_PASS=tu-contraseña-de-aplicacion
SMTP_FROM=noreply@transitotito.com

# URL del frontend (para links en emails)
FRONTEND_URL=http://localhost:4051
```

## Servicios SMTP Comunes

### Gmail
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=tu-email@gmail.com
SMTP_PASS=tu-contraseña-de-aplicacion
```

**Nota:** Para Gmail, necesitas crear una "Contraseña de aplicación" en tu cuenta de Google.

### Outlook/Hotmail
```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=tu-email@outlook.com
SMTP_PASS=tu-contraseña
```

### SendGrid
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=tu-api-key-de-sendgrid
```

## Modo de Desarrollo

Si no configuras las variables SMTP, el sistema usará un servicio de prueba (ethereal.email) que no enviará emails reales pero los simulará para desarrollo.

## Emails Enviados

1. **Email de Registro**: Se envía cuando un usuario se registra
   - Asunto: "✅ Inscripción Recibida - Transito Tito"
   - Contenido: Mensaje de bienvenida, información sobre beneficios, y aviso de que están pendientes de aprobación

2. **Email de Activación**: Se envía cuando un administrador aprueba un usuario
   - Asunto: "🎉 ¡Tu cuenta ha sido activada! - Transito Tito"
   - Contenido: Confirmación de activación, información sobre funcionalidades, y link para iniciar sesión

## Testing

Para probar los emails en desarrollo:

1. Configura las variables SMTP o déjalas sin configurar (usará ethereal.email)
2. Registra un nuevo usuario
3. Revisa los logs del servidor para ver el `messageId` del email enviado
4. Si usas ethereal.email, puedes ver el email en https://ethereal.email

