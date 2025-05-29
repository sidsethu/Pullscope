export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server';
import { fetchTotalCommitsForOrgWithAppAuth } from '@/lib/github';
import { TimeFilter } from '@/types';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const timeFilter = (url.searchParams.get('timeFilter') as TimeFilter) || '7d';
    const org = process.env.GITHUB_ORG;
    
    if (!org) {
      return NextResponse.json({ error: 'GITHUB_ORG not set' }, { status: 500 });
    }

    const commits = await fetchTotalCommitsForOrgWithAppAuth(org, timeFilter);
    return NextResponse.json({ commits });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 