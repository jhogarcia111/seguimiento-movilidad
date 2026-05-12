import { NextResponse } from 'next/server';
import { getGeneralMobilityProblems } from '@/lib/services/mobilityService';
import { ensureDatabaseInitialized, getDatabase } from '@/lib/db/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * GET /api/cron/refresh-cache
 *
 * Endpoint invocado por Vercel Cron Jobs para refrescar la cache general
 * de movilidad. Reemplaza al `node-cron` que existía en el backend Express
 * y que no funciona en entornos serverless.
 *
 * Seguridad:
 *  - Vercel envía `Authorization: Bearer ${CRON_SECRET}` automáticamente
 *    para cada cron job (https://vercel.com/docs/cron-jobs/manage-cron-jobs).
 *  - Si `CRON_SECRET` no está definido, en local permitimos la ejecución
 *    para facilitar pruebas con `curl http://localhost:4051/api/cron/refresh-cache`.
 */
export async function GET(request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization') || '';
  const provided = authHeader.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length).trim()
    : '';

  if (cronSecret) {
    if (provided !== cronSecret) {
      return NextResponse.json(
        { error: 'No autorizado', message: 'CRON_SECRET inválido' },
        { status: 401 }
      );
    }
  } else if (process.env.VERCEL) {
    return NextResponse.json(
      {
        error: 'No autorizado',
        message: 'CRON_SECRET debe estar configurado en variables de entorno en producción',
      },
      { status: 401 }
    );
  }

  const startedAt = Date.now();
  console.log(`⏰ [CRON] Iniciando refresh de cache (${new Date().toISOString()})`);

  try {
    await ensureDatabaseInitialized();

    const pool = getDatabase();
    try {
      await pool.execute('DELETE FROM general_mobility_cache WHERE expires_at < ?', [
        new Date().toISOString(),
      ]);
    } catch (cleanupError) {
      console.warn('⚠️ [CRON] Error limpiando cache antigua:', cleanupError.message);
    }

    const results = await getGeneralMobilityProblems();
    const elapsedMs = Date.now() - startedAt;

    console.log(
      `✅ [CRON] Cache refrescada: ${results.incidents?.length || 0} incidentes (${elapsedMs} ms)`
    );

    return NextResponse.json({
      success: true,
      message: 'Cache de movilidad refrescada correctamente',
      timestamp: new Date().toISOString(),
      elapsed_ms: elapsedMs,
      incidents_count: results.incidents?.length || 0,
      source: results.source,
      is_mock: results.isMock || false,
    });
  } catch (error) {
    const elapsedMs = Date.now() - startedAt;
    console.error(`❌ [CRON] Error refrescando cache (${elapsedMs} ms):`, error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error refrescando cache',
        timestamp: new Date().toISOString(),
        elapsed_ms: elapsedMs,
      },
      { status: 500 }
    );
  }
}
