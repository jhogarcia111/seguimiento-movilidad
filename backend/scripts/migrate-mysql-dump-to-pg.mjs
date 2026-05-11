/**
 * Migra un volcado SQL de MySQL (INSERT solamente) a PostgreSQL (Neon).
 * Uso: node scripts/migrate-mysql-dump-to-pg.mjs [ruta/al/archivo.sql]
 * Requiere DATABASE_URL en backend/.env
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import dotenv from 'dotenv';
import { initDatabase } from '../src/database/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const INSERT_ORDER = [
  'users',
  'tags',
  'sources',
  'source_tags',
  'system_config',
  'api_usage_stats',
  'general_mobility_cache',
  'incidents',
  'scraping_cache',
  'waze_cache',
  'notifications',
  'searches',
  'search_results',
  'user_activities',
  'tweets_cache',
];

const JSON_COLUMNS = new Set([
  'activity_data',
  'public_metrics',
  'coordinates',
  'result_data',
]);

const BOOL_COLUMNS = new Set(['is_active', 'api_exceeded', 'is_read']);

/** Desde '(' devuelve índice tras el ')' que cierra el grupo inicial */
function parseParenEnd(s, start) {
  if (s[start] !== '(') throw new Error('Se esperaba (');
  let depth = 0;
  let inString = false;
  for (let i = start; i < s.length; i++) {
    const c = s[i];
    if (inString) {
      if (c === '\\' && i + 1 < s.length) {
        i++;
        continue;
      }
      if (c === "'" && s[i + 1] === "'") {
        i++;
        continue;
      }
      if (c === "'") inString = false;
      continue;
    }
    if (c === "'") {
      inString = true;
      continue;
    }
    if (c === '(') depth++;
    if (c === ')') {
      depth--;
      if (depth === 0) return i + 1;
    }
  }
  throw new Error('Paréntesis sin cerrar en volcado MySQL');
}

function splitTopLevelCommas(s) {
  const parts = [];
  let start = 0;
  let depth = 0;
  let inString = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inString) {
      if (c === '\\' && i + 1 < s.length) {
        i++;
        continue;
      }
      if (c === "'" && s[i + 1] === "'") {
        i++;
        continue;
      }
      if (c === "'") inString = false;
      continue;
    }
    if (c === "'") {
      inString = true;
      continue;
    }
    if (c === '(') depth++;
    if (c === ')') depth--;
    if (c === ',' && depth === 0) {
      parts.push(s.slice(start, i).trim());
      start = i + 1;
    }
  }
  parts.push(s.slice(start).trim());
  return parts;
}

function parseSqlLiteral(token) {
  const t = token.trim();
  if (t.toUpperCase() === 'NULL') return null;
  if (t.startsWith("'")) {
    if (!t.endsWith("'")) throw new Error('String SQL mal cerrado');
    let i = 1;
    let out = '';
    while (i < t.length - 1) {
      const c = t[i];
      if (c === '\\' && i + 1 < t.length - 1) {
        out += t[i + 1];
        i += 2;
        continue;
      }
      if (c === "'" && t[i + 1] === "'") {
        out += "'";
        i += 2;
        continue;
      }
      out += c;
      i++;
    }
    return out;
  }
  if (/^-?\d+$/.test(t)) return parseInt(t, 10);
  if (/^-?\d+\.\d+([eE][+-]?\d+)?$/.test(t)) return parseFloat(t);
  return t;
}

function parseTupleValues(tupleStr) {
  const inner = tupleStr.trim();
  if (!inner.startsWith('(') || !inner.endsWith(')')) {
    throw new Error('Tupla inválida');
  }
  const body = inner.slice(1, -1);
  return splitTopLevelCommas(body).map(parseSqlLiteral);
}

function extractInserts(sql) {
  const map = new Map();
  let idx = 0;
  const marker = 'INSERT INTO `';

  while (idx < sql.length) {
    const ins = sql.indexOf(marker, idx);
    if (ins === -1) break;

    const nameStart = ins + marker.length;
    const nameEnd = sql.indexOf('`', nameStart);
    const table = sql.slice(nameStart, nameEnd);

    const colsOpen = sql.indexOf('(', nameEnd);
    const colsClose = sql.indexOf(')', colsOpen);
    const colsRaw = sql.slice(colsOpen + 1, colsClose);
    const columns = colsRaw.split(',').map((c) => c.trim().replace(/^`|`$/g, ''));

    const valWord = sql.indexOf('VALUES', colsClose);
    if (valWord === -1) throw new Error(`VALUES no encontrado para ${table}`);
    let pos = sql.indexOf('(', valWord);
    const rows = [];

    while (pos < sql.length) {
      while (pos < sql.length && /\s/.test(sql[pos])) pos++;
      if (sql[pos] === ';') break;
      if (sql[pos] !== '(') break;
      const endTuple = parseParenEnd(sql, pos);
      const tupleStr = sql.slice(pos, endTuple);
      rows.push(parseTupleValues(tupleStr));
      pos = endTuple;
      while (pos < sql.length && (sql[pos] === ',' || /\s/.test(sql[pos]))) pos++;
    }

    while (pos < sql.length && sql[pos] !== ';') pos++;
    if (sql[pos] === ';') pos++;
    idx = pos;

    if (!map.has(table)) {
      map.set(table, { columns, rows: [...rows] });
    } else {
      const ex = map.get(table);
      if (ex.columns.join(',') !== columns.join(',')) {
        throw new Error(`Columnas distintas en múltiples INSERT de ${table}`);
      }
      ex.rows.push(...rows);
    }
  }

  return map;
}

function coerceRow(columns, row) {
  return row.map((v, i) => {
    const col = columns[i];
    if (BOOL_COLUMNS.has(col)) {
      if (v === null) return null;
      return Boolean(Number(v));
    }
    if (JSON_COLUMNS.has(col) && typeof v === 'string' && v.length > 0) {
      try {
        return JSON.parse(v);
      } catch {
        return v;
      }
    }
    return v;
  });
}

function buildInsertQuery(table, columns) {
  const quotedCols = columns.map((c) => `"${c}"`).join(', ');
  const ph = columns.map((_, i) => `$${i + 1}`).join(', ');
  return `INSERT INTO "${table}" (${quotedCols}) VALUES (${ph})`;
}

async function resetSequences(client) {
  const tables = [
    'users',
    'tags',
    'sources',
    'source_tags',
    'searches',
    'search_results',
    'system_config',
    'notifications',
    'user_activities',
    'incidents',
    'scraping_cache',
    'waze_cache',
    'general_mobility_cache',
    'tweets_cache',
  ];
  for (const t of tables) {
    const r = await client.query(`SELECT pg_get_serial_sequence($1, 'id') AS seq`, [t]);
    const seq = r.rows[0]?.seq;
    if (!seq) continue;
    await client.query(
      `SELECT setval($1::regclass, COALESCE((SELECT MAX(id) FROM "${t}"), 1), true)`,
      [seq]
    );
  }
}

async function main() {
  const dumpPath =
    process.argv[2] ||
    path.join(process.env.USERPROFILE || process.env.HOME || '', 'Downloads', 'seguimiento_movilidad.sql');

  if (!process.env.DATABASE_URL?.startsWith('postgres')) {
    console.error('❌ DATABASE_URL debe estar definida en backend/.env');
    process.exit(1);
  }

  if (!fs.existsSync(dumpPath)) {
    console.error('❌ No existe el archivo:', dumpPath);
    process.exit(1);
  }

  console.log('📂 Leyendo volcado:', dumpPath);
  const sql = fs.readFileSync(dumpPath, 'utf8');
  const data = extractInserts(sql);
  console.log(
    '📊 Tablas con datos:',
    [...data.keys()].sort().join(', ')
  );

  console.log('🏗️  Creando/verificando esquema en PostgreSQL...');
  await initDatabase();

  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    console.log('🗑️  Vaciando tablas (CASCADE)...');
    await client.query(`
      TRUNCATE TABLE
        search_results,
        searches,
        user_activities,
        notifications,
        source_tags,
        system_config,
        sources,
        tags,
        users,
        incidents,
        scraping_cache,
        waze_cache,
        general_mobility_cache,
        tweets_cache,
        api_usage_stats
      RESTART IDENTITY CASCADE
    `);

    let totalRows = 0;
    for (const table of INSERT_ORDER) {
      const pack = data.get(table);
      if (!pack || pack.rows.length === 0) {
        console.log(`⏭️  ${table}: sin filas en el volcado`);
        continue;
      }

      const { columns, rows } = pack;
      const q = buildInsertQuery(table, columns);
      console.log(`⬆️  ${table}: ${rows.length} filas...`);

      for (const row of rows) {
        if (row.length !== columns.length) {
          throw new Error(`${table}: columnas ${columns.length} vs valores ${row.length}`);
        }
        const vals = coerceRow(columns, row);
        await client.query(q, vals);
      }
      totalRows += rows.length;
    }

    console.log('🔢 Ajustando secuencias SERIAL...');
    await resetSequences(client);

    await client.query('COMMIT');
    console.log('========================================');
    console.log(`✅ Migración completada (${totalRows} filas insertadas).`);
    console.log('========================================');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', e.message);
    if (e.position) console.error('   posición SQL:', e.position);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
