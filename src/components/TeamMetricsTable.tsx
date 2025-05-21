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

type SortField = 'teamName' | 'mergedPRs' | 'avgCycleTime' | 'reviewedPRs' | 'openPRs' | 'commits';
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

  const totals = metrics.reduce(
    (acc, curr) => ({
      teamName: 'Total',
      mergedPRs: acc.mergedPRs + curr.mergedPRs,
      avgCycleTime: (acc.avgCycleTime * acc.mergedPRs + curr.avgCycleTime * curr.mergedPRs) / 
        (acc.mergedPRs + curr.mergedPRs || 1),
      reviewedPRs: acc.reviewedPRs + curr.reviewedPRs,
      openPRs: acc.openPRs + curr.openPRs,
      commits: acc.commits + curr.commits,
    }),
    { teamName: 'Total', mergedPRs: 0, avgCycleTime: 0, reviewedPRs: 0, openPRs: 0, commits: 0 }
  );

  if (isLoading) {
    return (
      <TableContainer>
        <Table variant="simple">
          <Thead>
            <Tr>
              <Th>Team</Th>
              <Th isNumeric>PRs Authored</Th>
              <Th isNumeric>Avg Cycle Time (hrs)</Th>
              <Th isNumeric>PRs Reviewed</Th>
              <Th isNumeric>Open PRs</Th>
              <Th isNumeric>Commits</Th>
            </Tr>
          </Thead>
          <Tbody>
            {[...Array(3)].map((_, i) => (
              <Tr key={i}>
                <Td><Skeleton height="20px" width="120px" /></Td>
                <Td isNumeric><Skeleton height="20px" width="60px" /></Td>
                <Td isNumeric><Skeleton height="20px" width="80px" /></Td>
                <Td isNumeric><Skeleton height="20px" width="60px" /></Td>
                <Td isNumeric><Skeleton height="20px" width="60px" /></Td>
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
    <TableContainer>
      <Table variant="simple">
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
            <SortableHeader
              field="avgCycleTime"
              label="Avg Cycle Time (hrs)"
              currentSort={sortField}
              currentOrder={sortOrder}
              isNumeric
              onSort={handleSort}
            />
            <SortableHeader
              field="reviewedPRs"
              label="PRs Reviewed"
              currentSort={sortField}
              currentOrder={sortOrder}
              isNumeric
              onSort={handleSort}
            />
            <SortableHeader
              field="openPRs"
              label="Open PRs"
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
          {sortedMetrics.map((metric) => (
            <Tr key={metric.teamName}>
              <Td>{metric.teamName}</Td>
              <Td isNumeric>{metric.mergedPRs}</Td>
              <Td isNumeric>{metric.avgCycleTime.toFixed(1)}</Td>
              <Td isNumeric>{metric.reviewedPRs}</Td>
              <Td isNumeric>{metric.openPRs}</Td>
              <Td isNumeric>{metric.commits}</Td>
            </Tr>
          ))}
        </Tbody>
        <Tfoot>
          <Tr fontWeight="bold" bg="gray.50">
            <Td>{totals.teamName}</Td>
            <Td isNumeric>{totals.mergedPRs}</Td>
            <Td isNumeric>{totals.avgCycleTime.toFixed(1)}</Td>
            <Td isNumeric>{totals.reviewedPRs}</Td>
            <Td isNumeric>{totals.openPRs}</Td>
            <Td isNumeric>{totals.commits}</Td>
          </Tr>
        </Tfoot>
      </Table>
    </TableContainer>
  );
} 