import { render, screen } from '@testing-library/react';
import TeamMetricsTable from '../TeamMetricsTable';
import { TeamMetrics } from '@/types';

const mockMetrics: TeamMetrics[] = [
  {
    teamName: 'platform',
    mergedPRs: 10,
    avgCycleTime: 24.5,
    reviewedPRs: 15,
  },
  {
    teamName: 'data',
    mergedPRs: 8,
    avgCycleTime: 12.3,
    reviewedPRs: 20,
  },
];

describe('TeamMetricsTable', () => {
  it('renders loading state correctly', () => {
    render(<TeamMetricsTable metrics={[]} isLoading={true} />);
    expect(screen.getAllByRole('row')).toHaveLength(4); // Header + 3 loading rows
  });

  it('renders empty state correctly', () => {
    render(<TeamMetricsTable metrics={[]} isLoading={false} />);
    expect(screen.getByText('No metrics available')).toBeInTheDocument();
  });

  it('renders metrics correctly', () => {
    render(<TeamMetricsTable metrics={mockMetrics} isLoading={false} />);
    
    // Check headers
    expect(screen.getByText('Team')).toBeInTheDocument();
    expect(screen.getByText('PRs Merged')).toBeInTheDocument();
    expect(screen.getByText('Avg Cycle Time (hrs)')).toBeInTheDocument();
    expect(screen.getByText('PRs Reviewed')).toBeInTheDocument();

    // Check team names
    expect(screen.getByText('platform')).toBeInTheDocument();
    expect(screen.getByText('data')).toBeInTheDocument();

    // Check metrics values
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('24.5')).toBeInTheDocument();
    expect(screen.getByText('15')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByText('12.3')).toBeInTheDocument();
    expect(screen.getByText('20')).toBeInTheDocument();
  });
}); 