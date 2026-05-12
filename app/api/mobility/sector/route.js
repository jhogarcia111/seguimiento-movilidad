import { NextResponse } from 'next/server';
import { getMobilityBySector } from '@/lib/services/mobilityService';
import { ensureDatabaseInitialized } from '@/lib/db/db';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(request) {
  try {
    await ensureDatabaseInitialized();
    const { searchParams } = new URL(request.url);
    const sector = searchParams.get('sector');
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');
    const source = searchParams.get('source');
    const skipCacheRaw = searchParams.get('skipCache');
    const skipCacheBool = skipCacheRaw === 'true';

    if (!sector) {
      return NextResponse.json(
        {
          error: 'El parámetro "sector" es requerido',
          example: '/api/mobility/sector?sector=Avenida Boyacá',
        },
        { status: 400 }
      );
    }

    const results = await getMobilityBySector(sector, lat, lng, source, skipCacheBool);

    return NextResponse.json({
      success: true,
      sector,
      source: source || 'all',
      timestamp: new Date().toISOString(),
      results: { ...results, isMock: results.isMock || false },
    });
  } catch (error) {
    console.error('Error en /sector:', error);
    return NextResponse.json(
      {
        error: error.message || 'Error al consultar movilidad',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
