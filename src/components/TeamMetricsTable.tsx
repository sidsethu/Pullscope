import {
  Table,
  Thead,
  Tbody,
  Tfoot,
  Tr,
  Th,
  Td,
  TableContainer,
  Text,
  Skeleton,
  HStack,
  Icon,
  Box,
} from '@chakra-ui/react';
import { TeamMetrics } from '@/types';
import { useState } from 'react';
import { ChevronUpIcon, ChevronDownIcon } from '@chakra-ui/icons';

type SortField =
  | 'teamName'
  | 'mergedPRs'
  | 'avgCycleTime'
  | 'reviewedPRs'
  | 'openPRs'
  | 'commits'
  | 'prsPerPerson'
  | 'totalMembers'
  // New sortable fields
  | 'avgAdditionsPerPR'
  | 'avgDeletionsPerPR'
  | 'avgFilesChangedPerPR';
type SortOrder = 'asc' | 'desc';

interface TeamMetricsTableProps {
  metrics: TeamMetrics[];
  isLoading: boolean;
  groupByName?: boolean;
  prOpenDaysThreshold?: number;
}

interface SortableHeaderProps {
  field: SortField;
  label: string;
  currentSort: SortField;
  currentOrder: SortOrder;
  isNumeric?: boolean;
  onSort: (field: SortField) => void;
}

function SortableHeader({ field, label, currentSort, currentOrder, isNumeric, onSort }: SortableHeaderProps) {
  const isActive = currentSort === field;
  
  return (
    <Th 
      isNumeric={isNumeric}
      cursor="pointer"
      onClick={() => onSort(field)}
      _hover={{ bg: 'gray.50' }}
    >
      <HStack spacing={2} justify={isNumeric ? 'flex-end' : 'flex-start'}>
        <Text>{label}</Text>
        <Box>
          {isActive ? (
            currentOrder === 'asc' ? <ChevronUpIcon /> : <ChevronDownIcon />
          ) : (
            <ChevronUpIcon color="gray.300" />
          )}
        </Box>
      </HStack>
    </Th>
  );
}

export default function TeamMetricsTable({ metrics, isLoading, groupByName = false, prOpenDaysThreshold }: TeamMetricsTableProps) {
  const [sortField, setSortField] = useState<SortField>('mergedPRs');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const sortedMetrics = [...metrics].sort((a, b) => {
    const multiplier = sortOrder === 'asc' ? 1 : -1;
    const aValue = a[sortField];
    const bValue = b[sortField];

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return multiplier * aValue.localeCompare(bValue);
    }
    return multiplier * (Number(aValue) - Number(bValue));
  });

  const totals = metrics.find(m => m.teamName === 'Total') || metrics.reduce(
    (acc, curr) => ({
      teamName: 'Total',
      mergedPRs: acc.mergedPRs + curr.mergedPRs,
      avgCycleTime: (acc.avgCycleTime * acc.mergedPRs + curr.avgCycleTime * curr.mergedPRs) / 
        (acc.mergedPRs + curr.mergedPRs || 1),
      reviewedPRs: acc.reviewedPRs + curr.reviewedPRs,
      openPRs: acc.openPRs + curr.openPRs,
      commits: acc.commits + curr.commits,
      prsPerPerson: 0, // Fallback, actual total prsPerPerson is from backend Total row
      totalMembers: acc.totalMembers + (curr.totalMembers || 0),
      // Add new fields to accumulator for fallback. Actual averages are from backend Total row.
      avgAdditionsPerPR: 0,
      avgDeletionsPerPR: 0,
      avgFilesChangedPerPR: 0,
    }),
    { 
      teamName: 'Total', mergedPRs: 0, avgCycleTime: 0, reviewedPRs: 0, openPRs: 0, commits: 0, prsPerPerson: 0, totalMembers: 0,
      // Initialize new fields for the fallback accumulator
      avgAdditionsPerPR: 0, avgDeletionsPerPR: 0, avgFilesChangedPerPR: 0
    }
  );
  // Note: The 'totals' object primarily relies on `metrics.find(m => m.teamName === 'Total')`.
  // The reduce logic above is a fallback and its averaging for new metrics is simplified,
  // as the backend's 'Total' row should be the source of truth for these averages.

  // Filter out the Total row from the main table
  const displayMetrics = sortedMetrics.filter(m => m.teamName !== 'Total');

  if (isLoading) {
    return (
      <TableContainer>
        <Table variant="simple">
          <Thead>
            <Tr>
              <Th>{groupByName ? 'Name' : 'Team'}</Th>
              <Th isNumeric>PRs Authored</Th>
              {/* New Headers for loading state - reordered */}
              <Th isNumeric>Adds/PR</Th>
              <Th isNumeric>Dels/PR</Th>
              <Th isNumeric>Files/PR</Th>
              <Th isNumeric>Avg Cycle Time (hrs)</Th>
              {!groupByName && <Th isNumeric>PRs/Person</Th>}
              {!groupByName && <Th isNumeric>Total Members</Th>}
              <Th isNumeric>Open PRs(5d+)</Th> 
              <Th isNumeric>Commits</Th>
            </Tr>
          </Thead>
          <Tbody>
            {[...Array(3)].map((_, i) => (
              <Tr key={i}>
                <Td><Skeleton height="20px" width="120px" /></Td> {/* Team/Name */}
                <Td isNumeric><Skeleton height="20px" width="60px" /></Td> {/* PRs Authored */}
                <Td isNumeric><Skeleton height="20px" width="60px" /></Td> {/* Adds/PR */}
                <Td isNumeric><Skeleton height="20px" width="60px" /></Td> {/* Dels/PR */}
                <Td isNumeric><Skeleton height="20px" width="60px" /></Td> {/* Files/PR */}
                <Td isNumeric><Skeleton height="20px" width="80px" /></Td> {/* Avg Cycle Time */}
                {!groupByName && <Td isNumeric><Skeleton height="20px" width="60px" /></Td>} {/* PRs/Person */}
                {!groupByName && <Td isNumeric><Skeleton height="20px" width="60px" /></Td>} {/* Total Members */}
                <Td isNumeric><Skeleton height="20px" width="60px" /></Td> {/* Open PRs */}
                <Td isNumeric><Skeleton height="20px" width="60px" /></Td> {/* Commits */}
              </Tr>
            ))}
          </Tbody>
        </Table>
      </TableContainer>
    );
  }

  if (!metrics.length) {
    return (
      <Text textAlign="center" color="gray.500">
        No metrics available
      </Text>
    );
  }

  return (
    <TableContainer w="full" minWidth="1200px" overflowX="auto">
      <Table variant="simple" w="full" minWidth="1200px">
        <Thead>
          <Tr>
            <SortableHeader
              field="teamName"
              label={groupByName ? 'Name' : 'Team'}
              currentSort={sortField}
              currentOrder={sortOrder}
              onSort={handleSort}
            />
            <SortableHeader
              field="mergedPRs"
              label="PRs Authored"
              currentSort={sortField}
              currentOrder={sortOrder}
              isNumeric
              onSort={handleSort}
            />
            {/* New Sortable Headers */}
            <SortableHeader
              field="avgAdditionsPerPR"
              label="Adds/PR"
              currentSort={sortField}
              currentOrder={sortOrder}
              isNumeric
              onSort={handleSort}
            />
            <SortableHeader
              field="avgDeletionsPerPR"
              label="Dels/PR"
              currentSort={sortField}
              currentOrder={sortOrder}
              isNumeric
              onSort={handleSort}
            />
            <SortableHeader
              field="avgFilesChangedPerPR"
              label="Files/PR"
              currentSort={sortField}
              currentOrder={sortOrder}
              isNumeric
              onSort={handleSort}
            />
            <SortableHeader
              field="avgCycleTime"
              label="Avg Cycle Time (hrs)"
              currentSort={sortField}
              currentOrder={sortOrder}
              isNumeric
              onSort={handleSort}
            />
            {!groupByName && (
              <SortableHeader
                field="prsPerPerson"
                label="PRs/Person"
                currentSort={sortField}
                currentOrder={sortOrder}
                isNumeric
                onSort={handleSort}
              />
            )}
            {!groupByName && (
              <SortableHeader
                field="totalMembers"
                label="Total Members"
                currentSort={sortField}
                currentOrder={sortOrder}
                isNumeric
                onSort={handleSort}
              />
            )}
            <SortableHeader
              field="openPRs"
              label="Open PRs(>5d)" 
              currentSort={sortField}
              currentOrder={sortOrder}
              isNumeric
              onSort={handleSort}
            />
            <SortableHeader
              field="commits"
              label="Commits"
              currentSort={sortField}
              currentOrder={sortOrder}
              isNumeric
              onSort={handleSort}
            />
          </Tr>
        </Thead>
        <Tbody>
          {displayMetrics.map((metric) => (
            <Tr key={metric.teamName}>
              <Td>{metric.teamName}</Td>
              <Td isNumeric>{isNaN(Number(metric.mergedPRs)) ? 0 : metric.mergedPRs}</Td>
              {/* New Data Cells - reordered */}
              <Td isNumeric>{isNaN(Number(metric.avgAdditionsPerPR)) ? 0 : Number(metric.avgAdditionsPerPR).toFixed(1)}</Td>
              <Td isNumeric>{isNaN(Number(metric.avgDeletionsPerPR)) ? 0 : Number(metric.avgDeletionsPerPR).toFixed(1)}</Td>
              <Td isNumeric>{isNaN(Number(metric.avgFilesChangedPerPR)) ? 0 : Number(metric.avgFilesChangedPerPR).toFixed(1)}</Td>
              <Td isNumeric>{isNaN(Number(metric.avgCycleTime)) ? 0 : metric.avgCycleTime.toFixed(1)}</Td>
              {!groupByName && (
                <Td isNumeric>{isNaN(Number(metric.prsPerPerson)) ? 0 : metric.prsPerPerson.toFixed(1)}</Td>
              )}
              {!groupByName && (
                <Td isNumeric>{metric.totalMembers}</Td>
              )}
              <Td isNumeric>{isNaN(Number(metric.openPRs)) ? 0 : metric.openPRs}</Td>
              <Td isNumeric>{isNaN(Number(metric.commits)) ? 0 : metric.commits}</Td>
            </Tr>
          ))}
        </Tbody>
        <Tfoot>
          <Tr fontWeight="bold" bg="gray.50">
            <Td>{totals.teamName}</Td>
            <Td isNumeric>{totals.mergedPRs}</Td>
            {/* Totals for New Columns - reordered */}
            <Td isNumeric>{Number(totals.avgAdditionsPerPR).toFixed(1)}</Td>
            <Td isNumeric>{Number(totals.avgDeletionsPerPR).toFixed(1)}</Td>
            <Td isNumeric>{Number(totals.avgFilesChangedPerPR).toFixed(1)}</Td>
            <Td isNumeric>{totals.avgCycleTime.toFixed(1)}</Td>
            {!groupByName && <Td isNumeric>{totals.prsPerPerson.toFixed(1)}</Td>}
            {!groupByName && <Td isNumeric>{totals.totalMembers}</Td>}
            <Td isNumeric>{totals.openPRs}</Td>
            <Td isNumeric>{totals.commits}</Td>
          </Tr>
        </Tfoot>
      </Table>
    </TableContainer>
  );
}
