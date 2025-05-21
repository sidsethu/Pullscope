import { Table, Thead, Tbody, Tr, Th, Td, TableContainer, Skeleton, Text } from '@chakra-ui/react';

export default function NammayatriRepoTable({ repos, isLoading }: { repos: any[]; isLoading: boolean }) {
  if (isLoading) {
    return (
      <TableContainer>
        <Table>
          <Thead>
            <Tr>
              <Th>Name</Th>
              <Th>Description</Th>
              <Th>Private</Th>
              <Th>Created</Th>
              <Th>Updated</Th>
            </Tr>
          </Thead>
          <Tbody>
            {[...Array(5)].map((_, i) => (
              <Tr key={i}>
                <Td><Skeleton height="20px" width="120px" /></Td>
                <Td><Skeleton height="20px" width="200px" /></Td>
                <Td><Skeleton height="20px" width="60px" /></Td>
                <Td><Skeleton height="20px" width="100px" /></Td>
                <Td><Skeleton height="20px" width="100px" /></Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </TableContainer>
    );
  }

  if (!repos.length) {
    return <Text textAlign="center" color="gray.500">No repositories found.</Text>;
  }

  return (
    <TableContainer>
      <Table>
        <Thead>
          <Tr>
            <Th>Name</Th>
            <Th>Description</Th>
            <Th>Private</Th>
            <Th>Created</Th>
            <Th>Updated</Th>
          </Tr>
        </Thead>
        <Tbody>
          {repos.map((repo: any) => (
            <Tr key={repo.name}>
              <Td>
                <a href={repo.url} target="_blank" rel="noopener noreferrer" style={{ color: '#3182ce' }}>
                  {repo.name}
                </a>
              </Td>
              <Td>{repo.description || '-'}</Td>
              <Td>{repo.isPrivate ? 'Yes' : 'No'}</Td>
              <Td>{new Date(repo.createdAt).toLocaleDateString()}</Td>
              <Td>{new Date(repo.updatedAt).toLocaleDateString()}</Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </TableContainer>
  );
} 