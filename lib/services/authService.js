import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { getDatabase } from '../db/db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'tu_secreto_jwt_aqui_cambiar_en_produccion';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * Autentica un usuario con username/email y contraseña
 */
export async function authenticateUser(usernameOrEmail, password) {
  try {
    const pool = getDatabase();
    
    // Buscar usuario por username o email (ahora permitimos usuarios pending también)
    const [users] = await pool.execute(
      `SELECT id, username, email, password_hash, role, is_active, approval_status 
       FROM users 
       WHERE username = ? OR email = ?`,
      [usernameOrEmail, usernameOrEmail]
    );

    if (users.length === 0) {
      throw new Error('Usuario no encontrado');
    }

    const user = users[0];

    // Verificar contraseña
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!isValidPassword) {
      throw new Error('Contraseña incorrecta');
    }

    // LOS ADMINS SIEMPRE PUEDEN HACER LOGIN (no requieren aprobación)
    const isAdmin = user.role === 'admin';
    
    // Si el usuario está inactivo, no permitir login (excepto admins)
    if (!isAdmin && (!user.is_active || user.approval_status === 'inactive')) {
      throw new Error('Usuario inactivo');
    }

    // Si el usuario está pendiente de aprobación (pero no es admin), retornar información especial
    if (!isAdmin && user.approval_status === 'pending') {
      return {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          approval_status: user.approval_status
        },
        token: null, // No dar token si está pendiente
        pending: true
      };
    }

    // Generar token JWT solo para usuarios activos
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Retornar usuario (sin password_hash) y token
    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        approval_status: user.approval_status
      },
      token
    };
  } catch (error) {
    throw error;
  }
}

/**
 * Verifica y decodifica un token JWT
 */
export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    throw new Error('Token inválido o expirado');
  }
}

/**
 * Crea un nuevo usuario
 */
export async function createUser(userData) {
  try {
    const pool = getDatabase();
    const { username, email, password, role = 'usuario' } = userData;

    // Verificar que username y email no existan
    const [existing] = await pool.execute(
      'SELECT id FROM users WHERE username = ? OR email = ?',
      [username, email]
    );

    if (existing.length > 0) {
      throw new Error('El usuario o email ya existe');
    }

    // Hash de contraseña
    const passwordHash = await bcrypt.hash(password, 10);

    // Los admins siempre tienen approval_status = 'active', los usuarios normales quedan en 'pending'
    const approvalStatus = role === 'admin' ? 'active' : 'pending';

    // Insertar usuario con approval_status según el rol
    const [result] = await pool.execute(
      `INSERT INTO users (username, email, password_hash, role, is_active, approval_status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [username, email, passwordHash, role, true, approvalStatus]
    );

    return {
      id: result.insertId,
      username,
      email,
      role,
      approval_status: approvalStatus
    };
  } catch (error) {
    throw error;
  }
}

/**
 * Obtiene un usuario por ID
 */
export async function getUserById(userId) {
  try {
    const pool = getDatabase();
    const [users] = await pool.execute(
      `SELECT id, username, email, role, is_active, approval_status, created_at, updated_at
       FROM users WHERE id = ?`,
      [userId]
    );

    return users.length > 0 ? users[0] : null;
  } catch (error) {
    throw error;
  }
}
