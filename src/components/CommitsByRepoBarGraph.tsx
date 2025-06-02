import { Box, Spinner, Text } from '@chakra-ui/react';
import { Bar } from 'react-chartjs-2';
import { Chart, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js';

Chart.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

export default function CommitsByRepoBarGraph({
  data,
  loading,
}: {
  data: Record<string, number>;
  loading: boolean;
}) {
  if (loading) return <Spinner />;

  // Filter out repos with less than 1 commit
  const filteredEntries = Object.entries(data).filter(([_, count]) => count >= 1);
  const labels = filteredEntries.map(([repo]) => repo);
  const values = filteredEntries.map(([_, count]) => count);

  if (labels.length === 0) {
    return <Text>No commit data available for repos.</Text>;
  }

  return (
    <Box w="100%" maxW="900px" mx="auto">
      <Bar
        data={{
          labels,
          datasets: [
            {
              label: 'Commits by Repo',
              data: values,
              backgroundColor: 'rgba(54, 162, 235, 0.6)',
            },
          ],
        }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: { beginAtZero: true },
            x: {
              ticks: {
                autoSkip: false,
                maxRotation: 60,
                minRotation: 30,
                font: { size: 10 }
              }
            }
          },
          plugins: {
            legend: { display: false }
          }
        }}
        height={500}
      />
    </Box>
  );
} 