'use client';

import { useState, useEffect, useMemo } from 'react';
import Layout from '@/components/Layout';
import TeamMetricsTable from '@/components/TeamMetricsTable';
import TimeFilter from '@/components/TimeFilter';
import { TimeFilter as TimeFilterType, TeamMetrics } from '@/types';
import { useTeamMetrics } from '@/hooks/useTeamMetrics';
import { VStack, Alert, AlertIcon, AlertTitle, AlertDescription, Box, Button, HStack, Select } from '@chakra-ui/react';
import CommitsByRepoBarGraph from '@/components/CommitsByRepoBarGraph';
import DashboardIntroLoader from '@/components/DashboardIntroLoader';

// Helper to load team mapping CSV and return a list of { name, githubUsername }
async function loadTeamMappingList() {
  const res = await fetch('/data/team-mapping.csv');
  const text = await res.text();
  const lines = text.split('\n').slice(1); // skip header
  const list: { name: string; githubUsername: string }[] = [];
  for (const line of lines) {
    const cols = line.split(',');
    if (cols.length >= 4 && cols[0] && cols[3]) {
      list.push({ name: cols[0].trim(), githubUsername: cols[3].trim() });
    }
  }
  return list;
}

export default function Home() {
  const [timeFilter, setTimeFilter] = useState<TimeFilterType>('7d');
  const [prOpenDaysThreshold, setPrOpenDaysThreshold] = useState(5);
  const { teamMetrics, userMetrics, isLoading, isError } = useTeamMetrics(timeFilter, prOpenDaysThreshold);
  const [groupByName, setGroupByName] = useState(false);
  const [mappingList, setMappingList] = useState<{ name: string; githubUsername: string }[]>([]);
  const [view, setView] = useState<'user' | 'repo'>('user');
  const [repoCommits, setRepoCommits] = useState<Record<string, number>>({});
  // const [loading, setLoading] = useState(false); // Will be replaced by isFetchingRepoCommits
  const [showLoader, setShowLoader] = useState(true); // For initial page load
  const [loaderDissolve, setLoaderDissolve] = useState(false); // For initial page load

  // New states for "commits by repo" view loader
  const [isFetchingRepoCommits, setIsFetchingRepoCommits] = useState(false);
  const [showRepoCommitsLoader, setShowRepoCommitsLoader] = useState(false);
  const [repoCommitsLoaderDissolve, setRepoCommitsLoaderDissolve] = useState(false);

  useEffect(() => {
    if (groupByName) {
      loadTeamMappingList().then(setMappingList);
    }
  }, [groupByName]);

  // Remove 30d from time filter when switching to repo view
  useEffect(() => {
    if (view === 'repo' && timeFilter === '30d') {
      setTimeFilter('7d');
    }
  }, [view, timeFilter]);

  const metricsToShow = useMemo(() => {
    if (!groupByName) return teamMetrics;
    
    // Build user-level metrics using mappingList and userMetrics
    return mappingList
      .map((entry) => {
        const metrics = userMetrics[entry.githubUsername];
        return metrics
          ? { 
              teamName: entry.name,
              mergedPRs: metrics.mergedPRs,
              avgCycleTime: metrics.avgCycleTime,
              reviewedPRs: metrics.reviewedPRs,
              openPRs: metrics.openPRs,
              commits: metrics.commits,
              prsPerPerson: 0, // This is calculated per team, so 0 for individual user row
              totalMembers: 0, // This is a team concept, so 0 for individual user row
              // Add new average metrics from userMetrics
              avgAdditionsPerPR: metrics.avgAdditionsPerPR,
              avgDeletionsPerPR: metrics.avgDeletionsPerPR,
              avgFilesChangedPerPR: metrics.avgFilesChangedPerPR,
            }
          : { 
              teamName: entry.name,
              mergedPRs: 0,
              avgCycleTime: 0,
              reviewedPRs: 0,
              openPRs: 0,
              commits: 0,
              prsPerPerson: 0,
              totalMembers: 0,
              // Initialize new average metrics for users not found
              avgAdditionsPerPR: 0,
              avgDeletionsPerPR: 0,
              avgFilesChangedPerPR: 0,
            };
      })
      .filter((m) => m.teamName && m.teamName !== 'Other');
  }, [teamMetrics, userMetrics, groupByName, mappingList]);

  const handleShowRepoCommits = async () => {
    setIsFetchingRepoCommits(true);
    setShowRepoCommitsLoader(true);
    setRepoCommitsLoaderDissolve(false);
    setView('repo');
    // Remove 30d if selected
    if (timeFilter === '30d') {
      setTimeFilter('7d');
    }
    try {
      const res = await fetch(`/api/total-commits?timeFilter=${timeFilter === '30d' ? '7d' : timeFilter}`);
      const data = await res.json();
      setRepoCommits(data.commits?.repos || {});
    } catch (e) {
      setRepoCommits({});
    }
    setIsFetchingRepoCommits(false);
    setRepoCommitsLoaderDissolve(true);
    setTimeout(() => {
      setShowRepoCommitsLoader(false);
    }, 700); // Match dissolve animation duration
  };

  const handleShowUserView = () => setView('user');

  // Loader dissolve logic
  useEffect(() => {
    if (!isLoading && showLoader) {
      setLoaderDissolve(true);
      const timeout = setTimeout(() => setShowLoader(false), 700); // match dissolve duration
      return () => clearTimeout(timeout);
    }
    if (isLoading && !showLoader) {
      setShowLoader(true);
      setLoaderDissolve(false);
    }
  }, [isLoading]);

  return (
    <Layout>
      <VStack spacing={8} alignItems="stretch">
        {showLoader && <DashboardIntroLoader dissolve={loaderDissolve} />}
        {!showLoader && (
          <>
            {view === 'user' && (
              <TimeFilter value={timeFilter} onChange={setTimeFilter} />
            )}
            <HStack justifyContent="flex-end" spacing={4}>
              {view === 'user' && (
                <Button size="sm" onClick={() => setGroupByName((v) => !v)}>
                  {groupByName ? 'Group by Team' : 'Group by Name'}
                </Button>
              )}
              {view === 'repo' ? (
                <Button size="sm" onClick={handleShowUserView} colorScheme="gray">
                  See all metrics
                </Button>
              ) : (
                <Button size="sm" onClick={handleShowRepoCommits} colorScheme="gray">
                  Watch commits by repo
                </Button>
              )}
            </HStack>
            {view === 'repo' ? (
              showRepoCommitsLoader ? (
                <DashboardIntroLoader dissolve={repoCommitsLoaderDissolve} />
              ) : (
                <>
                  <Box as="h2" fontWeight="bold" fontSize="lg" mb={2} textAlign="center">
                    Commits by repo for the last 7 days
                  </Box>
                  <CommitsByRepoBarGraph data={repoCommits} loading={false} /> {/* loading is false as DashboardIntroLoader handles it */}
                </>
              )
            ) : isError ? (
              <Alert status="error" borderRadius="md">
                <AlertIcon />
                <Box>
                  <AlertTitle>Error loading metrics</AlertTitle>
                  <AlertDescription>
                    Please check your GitHub token and try again.
                  </AlertDescription>
                </Box>
              </Alert>
            ) : (
              <TeamMetricsTable
                metrics={metricsToShow}
                isLoading={isLoading}
                groupByName={groupByName}
                prOpenDaysThreshold={prOpenDaysThreshold}
              />
            )}
          </>
        )}
      </VStack>
    </Layout>
  );
}
