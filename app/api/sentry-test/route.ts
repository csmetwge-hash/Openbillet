import { NextResponse } from 'next/server';

export async function GET() {
  throw new Error('Sentry test error — safe to ignore, delete this route after confirming.');
}