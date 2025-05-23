import useSWR from 'swr';
import { TeamMetrics, TimeFilter, GitHubMetrics } from '@/types';

async function fetchTeamMetrics(timeFilter: TimeFilter): Promise<{ teamMetrics: TeamMetrics[]; userMetrics: Record<string, GitHubMetrics> }> {
  const response = await fetch(`/api/team-metrics?timeFilter=${timeFilter}`);
  if (!response.ok) throw new Error('Failed to fetch team metrics');
  return response.json();
}

export function useTeamMetrics(timeFilter: TimeFilter, prOpenDaysThreshold?: number) {
  const { data, error, isLoading } = useSWR(
    ['teamMetrics', timeFilter],
    () => fetchTeamMetrics(timeFilter),
    {
      refreshInterval: 3600000, // Refresh every hour
      revalidateOnFocus: false,
    }
  );

  return {
    teamMetrics: data?.teamMetrics || [],
    userMetrics: data?.userMetrics || {},
    isLoading,
    isError: error,
  };
} 