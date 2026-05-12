import { NextResponse } from 'next/server';
import { getGeneralMobilityProblems } from '@/lib/services/mobilityService';
import { ensureDatabaseInitialized } from '@/lib/db/db';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET() {
  try {
    await ensureDatabaseInitialized();
    const results = await getGeneralMobilityProblems();

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      last_updated: results.last_updated,
      results: {
        incidents: results.incidents,
        source: results.source,
        count: results.incidents.length,
        isMock: results.isMock || false,
      },
    });
  } catch (error) {
    console.error('Error en /general:', error);
    return NextResponse.json(
      {
        error: error.message || 'Error al consultar problemas generales de movilidad',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
