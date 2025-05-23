import React, { ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { useTeamMetrics } from '../useTeamMetrics';
import { loadTeamMappings } from '../../lib/team-mapping';
import { GitHubMetrics, TimeFilter } from '../../types';
import { SWRConfig } from 'swr';
import { TeamMetrics } from '@/types';

// Mock the dependencies
// jest.mock('../../lib/github');
jest.mock('../../lib/team-mapping');

const mockTeamMembers = [
  { githubUsername: 'alice', teamName: 'platform' },
  { githubUsername: 'bob', teamName: 'data' },
];

// Mock data with different creation dates
const mockPRs = {
  '30d': {
    'user1': { mergedPRs: 30, avgCycleTime: 24, reviewedPRs: 15, openPRs: 2, commits: 60 },
    'user2': { mergedPRs: 20, avgCycleTime: 12, reviewedPRs: 10, openPRs: 1, commits: 40 }
  },
  '7d': {
    'user1': { mergedPRs: 7, avgCycleTime: 24, reviewedPRs: 4, openPRs: 2, commits: 14 },
    'user2': { mergedPRs: 5, avgCycleTime: 12, reviewedPRs: 3, openPRs: 1, commits: 10 }
  },
  '1d': {
    'user1': { mergedPRs: 1, avgCycleTime: 24, reviewedPRs: 1, openPRs: 2, commits: 2 },
    'user2': { mergedPRs: 1, avgCycleTime: 12, reviewedPRs: 1, openPRs: 1, commits: 2 }
  }
};

// Mock team data
const mockTeamData = {
  teamMetrics: [
    {
      teamName: 'Team A',
      mergedPRs: 12,
      avgCycleTime: 18,
      reviewedPRs: 7,
      openPRs: 3,
      commits: 24,
      prsPerPerson: 4, // 12 PRs / 3 members
      totalMembers: 3
    },
    {
      teamName: 'Total',
      mergedPRs: 12,
      avgCycleTime: 18,
      reviewedPRs: 7,
      openPRs: 3,
      commits: 24,
      prsPerPerson: 4,
      totalMembers: 3
    }
  ],
  userMetrics: mockPRs['7d'] // Default to 7d data
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
  });

  it('should fetch metrics with default 7d timeFilter', async () => {
    global.fetch = jest.fn().mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockTeamData)
      })
    );

    const { result } = renderHook(() => useTeamMetrics('7d'), {
      wrapper: TestWrapper
    });

    // Should start with loading state
    expect(result.current.isLoading).toBe(true);
    expect(result.current.teamMetrics).toEqual([]);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Verify the fetch call
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('timeFilter=7d')
    );

    // Verify the returned data
    expect(result.current.teamMetrics[0]).toEqual(
      expect.objectContaining({
        teamName: 'Team A',
        mergedPRs: 12,
        prsPerPerson: 4,
        totalMembers: 3
      })
    );
  });

  it('should update metrics when timeFilter changes', async () => {
    // Mock fetch for different time periods
    global.fetch = jest.fn()
      .mockImplementationOnce(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          ...mockTeamData,
          userMetrics: mockPRs['7d']
        })
      }))
      .mockImplementationOnce(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          ...mockTeamData,
          userMetrics: mockPRs['1d']
        })
      }));

    const { result, rerender } = renderHook(
      ({ timeFilter }: { timeFilter: TimeFilter }) => useTeamMetrics(timeFilter),
      {
        wrapper: TestWrapper,
        initialProps: { timeFilter: '7d' }
      }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Check 7d data
    expect(result.current.userMetrics['user1'].mergedPRs).toBe(7);

    // Change to 1d
    rerender({ timeFilter: '1d' });

    await waitFor(() => {
      expect(result.current.userMetrics['user1'].mergedPRs).toBe(1);
    });

    // Verify fetch calls
    expect(global.fetch).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('timeFilter=7d')
    );
    expect(global.fetch).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('timeFilter=1d')
    );
  });

  it('should handle API errors gracefully', async () => {
    global.fetch = jest.fn().mockImplementationOnce(() =>
      Promise.resolve({
        ok: false,
        status: 500
      })
    );

    const { result } = renderHook(() => useTeamMetrics('7d'), {
      wrapper: TestWrapper
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isError).toBeTruthy();
    expect(result.current.teamMetrics).toEqual([]);
    expect(result.current.userMetrics).toEqual({});
  });

  it('should calculate PRs per person correctly based on team size', async () => {
    const mockDataWithDifferentTeamSizes = {
      teamMetrics: [
        {
          teamName: 'Large Team',
          mergedPRs: 20,
          avgCycleTime: 18,
          reviewedPRs: 10,
          openPRs: 3,
          commits: 40,
          prsPerPerson: 2, // 20 PRs / 10 members
          totalMembers: 10
        },
        {
          teamName: 'Small Team',
          mergedPRs: 15,
          avgCycleTime: 12,
          reviewedPRs: 8,
          openPRs: 2,
          commits: 30,
          prsPerPerson: 5, // 15 PRs / 3 members
          totalMembers: 3
        }
      ],
      userMetrics: mockPRs['7d']
    };

    global.fetch = jest.fn().mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockDataWithDifferentTeamSizes)
      })
    );

    const { result } = renderHook(() => useTeamMetrics('7d'), {
      wrapper: TestWrapper
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const largeTeam = result.current.teamMetrics.find(t => t.teamName === 'Large Team');
    const smallTeam = result.current.teamMetrics.find(t => t.teamName === 'Small Team');

    expect(largeTeam?.prsPerPerson).toBe(2);
    expect(smallTeam?.prsPerPerson).toBe(5);
  });
}); 