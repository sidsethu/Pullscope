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

  // Track team sizes based only on CSV
  const teamSizes: Record<string, number> = {};
  teamMembers.forEach(({ teamName }) => {
    if (teamName && teamName !== 'Other') {
      teamSizes[teamName] = (teamSizes[teamName] || 0) + 1;
    }
  });
  // Total team size is sum of all team sizes (excluding 'Other')
  const totalTeamSize = Object.entries(teamSizes).reduce((acc, [team, size]) => acc + size, 0);

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
    prsPerPerson: 0,
    totalMembers: 0,
    // Initialize new average metrics
    avgAdditionsPerPR: 0,
    avgDeletionsPerPR: 0,
    avgFilesChangedPerPR: 0,
  };

  // Temporary accumulators for new metrics within teamMetrics objects
  // These will be added to each team's object during initialization
  const newMetricsTemplate = {
    totalTeamAdditions: 0,
    totalTeamDeletions: 0,
    totalTeamChangedFiles: 0,
    totalTeamCycleTimeProductSum: 0, // For weighted avg cycle time
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
          prsPerPerson: 0,
          totalMembers: teamSizes[teamName] || 0,
          // Initialize new average metrics
          avgAdditionsPerPR: 0,
          avgDeletionsPerPR: 0,
          avgFilesChangedPerPR: 0,
          // Add temporary accumulators
          ...JSON.parse(JSON.stringify(newMetricsTemplate)), // Deep copy
        };
      }
    }
  });
  // Add accumulators to 'Other' team as well
  (teamMetrics['Other'] as any).totalTeamAdditions = 0;
  (teamMetrics['Other'] as any).totalTeamDeletions = 0;
  (teamMetrics['Other'] as any).totalTeamChangedFiles = 0;


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
    // Accumulate new total metrics
    (targetTeam as any).totalTeamAdditions += metrics.totalAdditions;
    (targetTeam as any).totalTeamDeletions += metrics.totalDeletions;
    (targetTeam as any).totalTeamChangedFiles += metrics.totalChangedFiles;
    // Accumulate product of (user's avgCycleTime * user's mergedPRs)
    (targetTeam as any).totalTeamCycleTimeProductSum += metrics.avgCycleTime * metrics.mergedPRs;
  });

  // Calculate averages for new metrics, PRs per person, and avgCycleTime for each team
  let totalMergedPRs = 0;
  let grandTotalAdditions = 0;
  let grandTotalDeletions = 0;
  let grandTotalChangedFiles = 0;
  let grandTotalCycleTimeProductSum = 0;

  Object.entries(teamMetrics).forEach(([teamName, teamData]) => {
    if (teamName !== 'Other') { // 'Other' team averages are kept at 0 for now
      const teamMergedPRs = teamData.mergedPRs;
      if (teamMergedPRs > 0) {
        teamData.avgAdditionsPerPR = (teamData as any).totalTeamAdditions / teamMergedPRs;
        teamData.avgDeletionsPerPR = (teamData as any).totalTeamDeletions / teamMergedPRs;
        teamData.avgFilesChangedPerPR = (teamData as any).totalTeamChangedFiles / teamMergedPRs;
        teamData.avgCycleTime = (teamData as any).totalTeamCycleTimeProductSum / teamMergedPRs;
      } else {
        teamData.avgAdditionsPerPR = 0;
        teamData.avgDeletionsPerPR = 0;
        teamData.avgFilesChangedPerPR = 0;
        teamData.avgCycleTime = 0; // Set to 0 if no merged PRs
      }
      const teamSize = teamData.totalMembers || 1; // Use CSV based team size
      teamData.prsPerPerson = teamMergedPRs / teamSize;
      
      totalMergedPRs += teamMergedPRs;
      grandTotalAdditions += (teamData as any).totalTeamAdditions;
      grandTotalDeletions += (teamData as any).totalTeamDeletions;
      grandTotalChangedFiles += (teamData as any).totalTeamChangedFiles;
      grandTotalCycleTimeProductSum += (teamData as any).totalTeamCycleTimeProductSum;
    }
  });
  
  // Set averages for 'Other' team to 0
  teamMetrics['Other'].avgAdditionsPerPR = 0;
  teamMetrics['Other'].avgDeletionsPerPR = 0;
  teamMetrics['Other'].avgFilesChangedPerPR = 0;
  teamMetrics['Other'].prsPerPerson = 0;
  teamMetrics['Other'].totalMembers = 0; // 'Other' team size is not tracked from CSV

  // Sum all other metrics for the "Total" row
  let totalReviewedPRs = 0;
  let totalOpenPRs = 0;
  let totalCommits = 0;

  Object.entries(teamMetrics).forEach(([teamName, metrics]) => {
    if (teamName !== 'Other' && teamName !== 'Total') {
      totalReviewedPRs += metrics.reviewedPRs;
      totalOpenPRs += metrics.openPRs;
      totalCommits += metrics.commits;
    }
  });

  teamMetrics['Total'] = {
    teamName: 'Total',
    mergedPRs: totalMergedPRs,
    avgCycleTime: totalMergedPRs > 0 ? grandTotalCycleTimeProductSum / totalMergedPRs : 0,
    reviewedPRs: totalReviewedPRs,
    openPRs: totalOpenPRs,
    commits: totalCommits,
    prsPerPerson: totalTeamSize > 0 ? totalMergedPRs / totalTeamSize : 0,
    totalMembers: totalTeamSize,
    avgAdditionsPerPR: totalMergedPRs > 0 ? grandTotalAdditions / totalMergedPRs : 0,
    avgDeletionsPerPR: totalMergedPRs > 0 ? grandTotalDeletions / totalMergedPRs : 0,
    avgFilesChangedPerPR: totalMergedPRs > 0 ? grandTotalChangedFiles / totalMergedPRs : 0,
  };
  
  // Clean up temporary accumulators from team data before returning
  Object.values(teamMetrics).forEach(teamData => {
    delete (teamData as any).totalTeamAdditions;
    delete (teamData as any).totalTeamDeletions;
    delete (teamData as any).totalTeamChangedFiles;
    delete (teamData as any).totalTeamCycleTimeProductSum;
  });

  if (otherUsers.length > 0) {
    console.error('[TeamMapping] Users grouped into "Other" team:', otherUsers);
  }

  return Object.values(teamMetrics);
}
