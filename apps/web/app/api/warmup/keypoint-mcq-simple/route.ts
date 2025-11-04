// HARD-KILL: Legacy warmup API has been deprecated
// All flows must use /api/solve instead
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json(
    { error: 'Warmup flow has been deprecated. Use /api/solve instead.' },
    { status: 410 }
  );
}

export async function POST() {
  return NextResponse.json(
    { error: 'Warmup flow has been deprecated. Use /api/solve instead.' },
    { status: 410 }
  );
}
