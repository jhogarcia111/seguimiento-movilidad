import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { getDatabase } from '../database/db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'tu_secreto_jwt_aqui_cambiar_en_produccion';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * Autentica un usuario con username/email y contraseña
 */
export async function authenticateUser(usernameOrEmail, password) {
  try {
    const pool = getDatabase();
    
    // Buscar usuario por username o email
    const [users] = await pool.execute(
      `SELECT id, username, email, password_hash, role, is_active 
       FROM users 
       WHERE (username = ? OR email = ?) AND is_active = TRUE`,
      [usernameOrEmail, usernameOrEmail]
    );

    if (users.length === 0) {
      throw new Error('Usuario no encontrado o inactivo');
    }

    const user = users[0];

    // Verificar contraseña
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!isValidPassword) {
      throw new Error('Contraseña incorrecta');
    }

    // Generar token JWT
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
        role: user.role
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

    // Insertar usuario
    const [result] = await pool.execute(
      `INSERT INTO users (username, email, password_hash, role, is_active)
       VALUES (?, ?, ?, ?, ?)`,
      [username, email, passwordHash, role, true]
    );

    return {
      id: result.insertId,
      username,
      email,
      role
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
      `SELECT id, username, email, role, is_active, created_at, updated_at
       FROM users WHERE id = ?`,
      [userId]
    );

    return users.length > 0 ? users[0] : null;
  } catch (error) {
    throw error;
  }
}
