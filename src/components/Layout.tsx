import { Box, Container, Heading, VStack } from '@chakra-ui/react';
import { ReactNode } from 'react';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <Box minH="100vh" bg="gray.50">
      <Container maxW="container.xl" py={8}>
        <VStack spacing={8} alignItems="stretch">
          <Heading as="h1" size="xl" textAlign="center">
            Developer Metrics Dashboard
          </Heading>
          {children}
        </VStack>
      </Container>
    </Box>
  );
} 