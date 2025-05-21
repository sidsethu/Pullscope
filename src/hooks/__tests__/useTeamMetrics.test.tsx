import React, { ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { useTeamMetrics } from '../useTeamMetrics';
import { loadTeamMappings } from '../../lib/team-mapping';
import { GitHubMetrics, TimeFilter } from '../../types';
import { SWRConfig } from 'swr';

// Mock the dependencies
// jest.mock('../../lib/github');
jest.mock('../../lib/team-mapping');

const mockTeamMembers = [
  { githubUsername: 'alice', teamName: 'platform' },
  { githubUsername: 'bob', teamName: 'data' },
];

const mockApiResponse = {
  teamMetrics: [
    { teamName: 'platform', mergedPRs: 5, avgCycleTime: 24, reviewedPRs: 10, openPRs: 2, commits: 20 },
    { teamName: 'data', mergedPRs: 3, avgCycleTime: 12, reviewedPRs: 8, openPRs: 1, commits: 10 },
  ],
  userMetrics: {
    alice: { mergedPRs: 5, avgCycleTime: 24, reviewedPRs: 10, openPRs: 2, commits: 20 },
    bob: { mergedPRs: 3, avgCycleTime: 12, reviewedPRs: 8, openPRs: 1, commits: 10 },
  }
};

// Create a wrapper component for SWR configuration
function TestWrapper({ children }: { children: ReactNode }) {
  return (
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
}

describe('useTeamMetrics', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => mockApiResponse
    } as any);
  });

  it('should fetch and aggregate team metrics', async () => {
    const { result } = renderHook(() => useTeamMetrics('7d'), { wrapper: TestWrapper });
    expect(result.current.isLoading).toBe(true);
    expect(result.current.teamMetrics).toEqual([]);
    await waitFor(() => {
      expect(result.current.teamMetrics).toEqual([
        expect.objectContaining({ teamName: 'platform' }),
        expect.objectContaining({ teamName: 'data' })
      ]);
    });
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isError).toBeFalsy();
  });

  it('should handle errors gracefully', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false });
    const { result } = renderHook(() => useTeamMetrics('7d'), { wrapper: TestWrapper });
    await waitFor(() => {
      expect(result.current.teamMetrics).toEqual([]);
    });
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isError).toBeTruthy();
  });

  it('should update metrics when timeFilter changes', async () => {
    const { result, rerender } = renderHook(
      ({ timeFilter }: { timeFilter: TimeFilter }) => useTeamMetrics(timeFilter),
      { wrapper: TestWrapper, initialProps: { timeFilter: '7d' } }
    );
    await waitFor(() => {
      expect(result.current.teamMetrics).toHaveLength(2);
    });
    rerender({ timeFilter: '30d' });
    await waitFor(() => {
      expect(result.current.teamMetrics).toHaveLength(2);
    });
  });
}); 