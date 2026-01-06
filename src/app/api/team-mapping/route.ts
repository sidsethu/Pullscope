import { NextResponse } from 'next/server';
import { loadTeamMappings } from '@/lib/team-mapping';

export async function GET() {
  try {
    const teamMembers = await loadTeamMappings();

    // Transform to include the 'name' field for client-side "Group by Name" feature
    const result = teamMembers
      .filter(m => m.githubUsername) // Only include members with GitHub usernames
      .map(m => ({
        name: m.name,
        githubUsername: m.githubUsername,
        teamName: m.teamName,
      }));

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error loading team mapping:', error);
    return NextResponse.json(
      { error: 'Failed to load team mapping' },
      { status: 500 }
    );
  }
}
