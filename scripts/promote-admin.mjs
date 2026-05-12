/**
 * Promueve uno o más usuarios a administrador y deja la cuenta activa.
 * Uso: node scripts/promote-admin.mjs Jho otroUsuario
 * Requiere DATABASE_URL en el entorno (carga .env.local si existe con dotenv — no incluido;
 * en Windows PowerShell: `$env:DATABASE_URL="postgresql://..."; node scripts/promote-admin.mjs Jho`)
 */
import pg from 'pg';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

function loadEnvFile(name) {
  const p = resolve(root, name);
  if (!existsSync(p)) return;
  const text = readFileSync(p, 'utf8');
  for (const line of text.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq <= 0) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

loadEnvFile('.env.local');
loadEnvFile('.env');

const usernames = process.argv.slice(2).filter(Boolean);
if (usernames.length === 0) {
  console.error('Uso: node scripts/promote-admin.mjs <usuario> [usuario2 ...]');
  process.exit(1);
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString?.startsWith('postgres')) {
  console.error('DATABASE_URL debe apuntar a PostgreSQL (postgresql://...).');
  process.exit(1);
}

const pool = new pg.Pool({ connectionString, max: 2 });

try {
  for (const name of usernames) {
    const r = await pool.query(
      `UPDATE users
       SET role = 'admin',
           approval_status = 'active',
           is_active = TRUE,
           updated_at = CURRENT_TIMESTAMP
       WHERE LOWER(TRIM(username)) = LOWER(TRIM($1))`,
      [name]
    );
    if (r.rowCount === 0) {
      console.warn(`No existe usuario con username "${name}" (ignorado).`);
    } else {
      console.log(`OK: "${name}" ahora es administrador y está activo.`);
    }
  }
} finally {
  await pool.end();
}
