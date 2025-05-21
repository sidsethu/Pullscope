import { NextResponse } from 'next/server';
import { fetchAllMetrics } from '@/lib/github';
import { loadTeamMappings, groupMetricsByTeam } from '@/lib/team-mapping';

export async function GET() {
  try {
    const [teamMembers, userMetrics] = await Promise.all([
      loadTeamMappings(),
      fetchAllMetrics('30d') // Always fetch 30 days of data
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