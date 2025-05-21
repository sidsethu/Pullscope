import useSWR from 'swr';
import { TeamMetrics, TimeFilter, GitHubMetrics } from '@/types';

async function fetchTeamMetrics(): Promise<{ teamMetrics: TeamMetrics[]; userMetrics: Record<string, GitHubMetrics> }> {
  const response = await fetch('/api/team-metrics');
  if (!response.ok) throw new Error('Failed to fetch team metrics');
  return response.json();
}

export function useTeamMetrics(timeFilter: TimeFilter, prOpenDaysThreshold?: number) {
  const { data, error, isLoading } = useSWR(
    'teamMetrics',
    fetchTeamMetrics,
    {
      refreshInterval: 3600000, // Refresh every hour
      revalidateOnFocus: false,
    }
  );

  // Filter team metrics based on timeFilter on the client side
  const filteredTeamMetrics = data?.teamMetrics?.map((team: TeamMetrics) => {
    const daysRatio = {
      '1d': 1/30,
      '7d': 7/30,
      '30d': 1
    }[timeFilter];

    return {
      ...team,
      mergedPRs: Math.round(team.mergedPRs * daysRatio),
      reviewedPRs: Math.round(team.reviewedPRs * daysRatio),
      openPRs: team.openPRs, // Don't scale open PRs as they are current
      avgCycleTime: team.avgCycleTime // Don't scale cycle time as it's an average
    };
  }) || [];

  // Filter user metrics
  const filteredUserMetrics = data?.userMetrics ? Object.entries(data.userMetrics).reduce((acc, [username, metrics]) => {
    const daysRatio = {
      '1d': 1/30,
      '7d': 7/30,
      '30d': 1
    }[timeFilter];

    acc[username] = {
      ...metrics,
      mergedPRs: Math.round(metrics.mergedPRs * daysRatio),
      reviewedPRs: Math.round(metrics.reviewedPRs * daysRatio),
      openPRs: metrics.openPRs, // Don't scale open PRs as they are current
      avgCycleTime: metrics.avgCycleTime // Don't scale cycle time as it's an average
    };
    return acc;
  }, {} as Record<string, GitHubMetrics>) : {};

  return {
    teamMetrics: filteredTeamMetrics,
    userMetrics: filteredUserMetrics,
    isLoading,
    isError: error,
  };
} 