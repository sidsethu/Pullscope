import useSWR from 'swr';
import { TeamMetrics, TimeFilter } from '@/types';

async function fetchTeamMetrics(timeFilter: TimeFilter, prOpenDaysThreshold?: number): Promise<TeamMetrics[]> {
  const url = `/api/team-metrics?timeFilter=${timeFilter}` + (prOpenDaysThreshold ? `&prOpenDaysThreshold=${prOpenDaysThreshold}` : '');
  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed to fetch team metrics');
  return response.json();
}

export function useTeamMetrics(timeFilter: TimeFilter, prOpenDaysThreshold?: number) {
  const { data, error, isLoading } = useSWR(
    ['teamMetrics', timeFilter, prOpenDaysThreshold],
    () => fetchTeamMetrics(timeFilter, prOpenDaysThreshold),
    {
      refreshInterval: 3600000, // Refresh every hour
      revalidateOnFocus: false,
    }
  );

  return {
    metrics: data || [],
    isLoading,
    isError: error,
  };
} 