import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/auth';
import { getDatabase, ensureDatabaseInitialized } from '@/lib/db/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CACHE_TABLES = [
  { id: 'general_mobility_cache', label: 'Cache general de movilidad (home)' },
  { id: 'incidents', label: 'Cache de incidentes por sector' },
  { id: 'scraping_cache', label: 'Cache de scraping (HTML raw)' },
  { id: 'waze_cache', label: 'Cache de Waze' },
  { id: 'tweets_cache', label: 'Cache de tweets' },
];

/**
 * GET /api/admin/cache
 * Devuelve un resumen de filas y tamaño aproximado por tabla de cache.
 */
export async function GET(request) {
  await ensureDatabaseInitialized();
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const pool = getDatabase();
  const summary = [];
  const now = new Date().toISOString();

  for (const table of CACHE_TABLES) {
    try {
      const [totalRows] = await pool.execute(`SELECT COUNT(*) AS total FROM ${table.id}`);
      const [activeRows] = await pool.execute(
        `SELECT COUNT(*) AS active FROM ${table.id} WHERE expires_at > ?`,
        [now]
      );
      const total = Number(totalRows?.[0]?.total ?? 0);
      const active = Number(activeRows?.[0]?.active ?? 0);
      summary.push({
        id: table.id,
        label: table.label,
        total,
        active,
        expired: total - active,
      });
    } catch (error) {
      summary.push({
        id: table.id,
        label: table.label,
        error: error.message,
      });
    }
  }

  return NextResponse.json({
    success: true,
    timestamp: now,
    caches: summary,
  });
}

/**
 * DELETE /api/admin/cache
 * Body opcional: { tables: ['general_mobility_cache', ...], onlyExpired: true|false }
 *   - Si no se pasa `tables`, limpia todas las tablas registradas.
 *   - Si `onlyExpired` es true (default), solo borra filas con expires_at < now.
 *     Si es false, borra TODAS las filas (cache total).
 */
export async function DELETE(request) {
  await ensureDatabaseInitialized();
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  let body = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const requested = Array.isArray(body.tables) && body.tables.length > 0
    ? body.tables
    : CACHE_TABLES.map((t) => t.id);
  const onlyExpired = body.onlyExpired !== false;

  const valid = new Set(CACHE_TABLES.map((t) => t.id));
  const targets = requested.filter((t) => valid.has(t));

  if (targets.length === 0) {
    return NextResponse.json(
      { error: 'Tablas no válidas', allowed: [...valid] },
      { status: 400 }
    );
  }

  const pool = getDatabase();
  const now = new Date().toISOString();
  const cleared = [];

  for (const table of targets) {
    try {
      const [result] = onlyExpired
        ? await pool.execute(`DELETE FROM ${table} WHERE expires_at < ?`, [now])
        : await pool.execute(`DELETE FROM ${table}`);
      cleared.push({
        table,
        deleted: result?.affectedRows ?? result?.rowCount ?? 0,
        scope: onlyExpired ? 'expired' : 'all',
      });
    } catch (error) {
      cleared.push({ table, error: error.message });
    }
  }

  return NextResponse.json({
    success: true,
    timestamp: now,
    onlyExpired,
    cleared,
  });
}
