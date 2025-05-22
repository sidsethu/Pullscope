import { TeamMember, TeamMetrics, GitHubMetrics } from '@/types';
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';

export async function loadTeamMappings(): Promise<TeamMember[]> {
  try {
    const csvPath = path.join(process.cwd(), 'public', 'data', 'team-mapping.csv');
    const fileContent = fs.readFileSync(csvPath, 'utf-8');
    
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
    });

    return records.map((record: any) => ({
      githubUsername: record.github_username || '',
      teamName: record.team_name || '',
    }));
  } catch (error) {
    console.error('Error loading team mapping:', error);
    throw new Error('Failed to load team mapping');
  }
}

export function groupMetricsByTeam(
  userMetrics: Record<string, GitHubMetrics>,
  teamMembers: TeamMember[]
): TeamMetrics[] {
  const teamMetrics: Record<string, TeamMetrics> = {};
  const mappedUsernames = new Set(teamMembers.map(member => member.githubUsername).filter(Boolean));

  // List of users to exclude from all calculations
  const EXCLUDED_USERS = new Set([
    'coderabbitai',
    'github-actions',
    'dependabot',
    'github-advanced-security',
    'copilot-pull-request-reviewer',
  ]);

  // Initialize team metrics, including 'Other'
  teamMetrics['Other'] = {
    teamName: 'Other',
    mergedPRs: 0,
    avgCycleTime: 0,
    reviewedPRs: 0,
    openPRs: 0,
    commits: 0,
  };

  // Initialize other team metrics
  teamMembers.forEach(({ teamName }) => {
    if (teamName && teamName !== 'Other') {
      if (!teamMetrics[teamName]) {
        teamMetrics[teamName] = {
          teamName,
          mergedPRs: 0,
          avgCycleTime: 0,
          reviewedPRs: 0,
          openPRs: 0,
          commits: 0,
        };
      }
    }
  });

  // Track users grouped into 'Other'
  const otherUsers: string[] = [];

  // Process all users with metrics
  Object.entries(userMetrics).forEach(([username, metrics]) => {
    // Exclude bot/system users
    if (EXCLUDED_USERS.has(username)) return;
    // Find team mapping for this user
    const teamMember = teamMembers.find(member => member.githubUsername === username);
    
    // If user is not in mapping or has no team name, add to 'Other'
    const teamName = teamMember?.teamName || 'Other';
    const targetTeam = teamMetrics[teamName] || teamMetrics['Other'];

    if (teamName === 'Other') {
      otherUsers.push(username);
    }

    // Update team metrics
    targetTeam.mergedPRs += metrics.mergedPRs;
    targetTeam.reviewedPRs += metrics.reviewedPRs;
    targetTeam.openPRs += metrics.openPRs;
    targetTeam.commits += metrics.commits;

    // Update average cycle time
    if (metrics.avgCycleTime > 0) {
      const currentTotal = targetTeam.avgCycleTime * targetTeam.mergedPRs;
      targetTeam.avgCycleTime = 
        (currentTotal + metrics.avgCycleTime * metrics.mergedPRs) / 
        (targetTeam.mergedPRs + metrics.mergedPRs);
    }
  });

  if (otherUsers.length > 0) {
    console.error('[TeamMapping] Users grouped into "Other" team:', otherUsers);
  }

  return Object.values(teamMetrics);
} 