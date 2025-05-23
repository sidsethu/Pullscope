import { NextResponse } from 'next/server';
import { fetchAllMetrics } from '@/lib/github';
import { loadTeamMappings, groupMetricsByTeam } from '@/lib/team-mapping';
import { TimeFilter } from '@/types';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const timeFilter = (url.searchParams.get('timeFilter') as TimeFilter) || '7d';

    const [teamMembers, userMetrics] = await Promise.all([
      loadTeamMappings(),
      fetchAllMetrics(timeFilter)
    ]);

    const teamMetrics = groupMetricsByTeam(userMetrics, teamMembers);
    return NextResponse.json({ teamMetrics, userMetrics });
  } catch (error) {
    console.error('Error fetching team metrics:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 