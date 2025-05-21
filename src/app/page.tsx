'use client';

import { useState, useEffect, useMemo } from 'react';
import Layout from '@/components/Layout';
import TeamMetricsTable from '@/components/TeamMetricsTable';
import TimeFilter from '@/components/TimeFilter';
import { TimeFilter as TimeFilterType, TeamMetrics } from '@/types';
import { useTeamMetrics } from '@/hooks/useTeamMetrics';
import { VStack, Alert, AlertIcon, AlertTitle, AlertDescription, Box, Button, HStack, Select } from '@chakra-ui/react';

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
  const [prOpenDaysThreshold, setPrOpenDaysThreshold] = useState(10);
  const { metrics, isLoading, isError } = useTeamMetrics(timeFilter, prOpenDaysThreshold);
  const [groupByName, setGroupByName] = useState(false);
  const [mappingList, setMappingList] = useState<{ name: string; githubUsername: string }[]>([]);

  useEffect(() => {
    if (groupByName) {
      loadTeamMappingList().then(setMappingList);
    }
  }, [groupByName]);

  const metricsToShow = useMemo(() => {
    if (!groupByName) return metrics;
    // Build user-level metrics using mappingList
    return mappingList
      .map((entry) => {
        const m = metrics.find((x) => x.teamName === entry.githubUsername);
        return m
          ? { ...m, teamName: entry.name, openPRs: m.openPRs ?? 0 }
          : { teamName: entry.name, mergedPRs: 0, avgCycleTime: 0, reviewedPRs: 0, openPRs: 0 };
      })
      .filter((m) => m.teamName && m.teamName !== 'Other');
  }, [metrics, groupByName, mappingList]);

  return (
    <Layout>
      <VStack spacing={8} alignItems="stretch">
        <TimeFilter value={timeFilter} onChange={setTimeFilter} />
        <HStack justifyContent="flex-end" spacing={4}>
          <Button size="sm" onClick={() => setGroupByName((v) => !v)}>
            {groupByName ? 'Group by Team' : 'Group by Name'}
          </Button>
        </HStack>
        {isError ? (
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
          <TeamMetricsTable metrics={metricsToShow} isLoading={isLoading} groupByName={groupByName} prOpenDaysThreshold={prOpenDaysThreshold} />
        )}
      </VStack>
    </Layout>
  );
} 