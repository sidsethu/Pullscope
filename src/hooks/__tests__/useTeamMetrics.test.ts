/** @jest-environment jsdom */
import { renderHook, waitFor } from '@testing-library/react';
import { useTeamMetrics } from '../useTeamMetrics';
import { fetchUserMetrics } from '@/lib/github';
import { loadTeamMappings } from '@/lib/team-mapping';
import { GitHubMetrics, TimeFilter } from '@/types';
import { SWRConfig } from 'swr';
import { ReactNode } from 'react';

// Mock the dependencies
jest.mock('@/lib/github');
jest.mock('@/lib/team-mapping');

const mockTeamMembers = [
  { githubUsername: 'alice', teamName: 'platform' },
  { githubUsername: 'bob', teamName: 'data' },
];

const mockUserMetrics: Record<string, GitHubMetrics> = {
  alice: {
    mergedPRs: 5,
    avgCycleTime: 24,
    reviewedPRs: 10,
  },
  bob: {
    mergedPRs: 3,
    avgCycleTime: 12,
    reviewedPRs: 8,
  },
};

// Create a wrapper component for SWR configuration
const wrapper = ({ children }: { children: ReactNode }) => (
  <SWRConfig 
    value={{
      provider: () => new Map(),
      dedupingInterval: 0,
      refreshInterval: 0,
      fallback: {}
    }}
  >
    {children}
  </SWRConfig>
);

describe('useTeamMetrics', () => {
  beforeEach(() => {
    // Reset all mocks
    jest.resetAllMocks();
    
    // Setup mock implementations
    (loadTeamMappings as jest.Mock).mockResolvedValue(mockTeamMembers);
    (fetchUserMetrics as jest.Mock).mockImplementation((username: string) => 
      Promise.resolve(mockUserMetrics[username])
    );
  });

  it('should fetch and aggregate team metrics', async () => {
    const { result } = renderHook(() => useTeamMetrics('7d'), { wrapper });

    // Initially should be loading with empty metrics
    expect(result.current.isLoading).toBe(true);
    expect(result.current.metrics).toEqual([]);

    // Wait for data to be loaded
    await waitFor(() => {
      expect(result.current.metrics).toEqual([
        {
          teamName: 'platform',
          mergedPRs: 5,
          avgCycleTime: 24,
          reviewedPRs: 10,
        },
        {
          teamName: 'data',
          mergedPRs: 3,
          avgCycleTime: 12,
          reviewedPRs: 8,
        },
      ]);
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.isError).toBeFalsy();
  });

  it('should handle errors gracefully', async () => {
    // Mock an error in fetchUserMetrics
    (fetchUserMetrics as jest.Mock).mockRejectedValue(new Error('API Error'));

    const { result } = renderHook(() => useTeamMetrics('7d'), { wrapper });

    // Wait for data to be loaded
    await waitFor(() => {
      expect(result.current.metrics).toEqual([
        {
          teamName: 'platform',
          mergedPRs: 0,
          avgCycleTime: 0,
          reviewedPRs: 0,
        },
        {
          teamName: 'data',
          mergedPRs: 0,
          avgCycleTime: 0,
          reviewedPRs: 0,
        },
      ]);
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.isError).toBeTruthy();
  });

  it('should update metrics when timeFilter changes', async () => {
    const { result, rerender } = renderHook(
      ({ timeFilter }: { timeFilter: TimeFilter }) => useTeamMetrics(timeFilter),
      { 
        wrapper,
        initialProps: { timeFilter: '7d' }
      }
    );

    // Wait for initial data
    await waitFor(() => {
      expect(result.current.metrics).toHaveLength(2);
    });

    // Change time filter
    rerender({ timeFilter: '30d' });

    // Verify that fetchUserMetrics was called with new timeFilter
    await waitFor(() => {
      expect(fetchUserMetrics).toHaveBeenCalledWith('alice', '30d');
      expect(fetchUserMetrics).toHaveBeenCalledWith('bob', '30d');
    });
  });
}); 