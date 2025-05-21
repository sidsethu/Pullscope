import { NextResponse } from 'next/server';
import { fetchAllMetrics } from '@/lib/github';
import { TimeFilter } from '@/types';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const timeFilter = url.searchParams.get('timeFilter') as TimeFilter || '7d';

    const metrics = await fetchAllMetrics(timeFilter);
    return NextResponse.json(metrics);
  } catch (error) {
    console.error('Error fetching metrics:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 