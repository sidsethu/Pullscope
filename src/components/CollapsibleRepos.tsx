import { useState } from 'react';
import {
  Box,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  Heading,
} from '@chakra-ui/react';
import NammayatriRepoTable from './NammayatriRepoTable';
import { useNammayatriRepos } from '@/hooks/useNammayatriRepos';

export default function CollapsibleRepos() {
  const [isExpanded, setIsExpanded] = useState(false);
  const { repos, isLoading } = useNammayatriRepos(isExpanded);

  return (
    <Accordion allowToggle onChange={(index) => setIsExpanded(index === 0)}>
      <AccordionItem>
        <h2>
          <AccordionButton>
            <Box flex="1" textAlign="left">
              <Heading as="h2" size="lg">
                NammaYatri Organization Repositories
              </Heading>
            </Box>
            <AccordionIcon />
          </AccordionButton>
        </h2>
        <AccordionPanel pb={4}>
          <NammayatriRepoTable repos={repos} isLoading={isLoading} />
        </AccordionPanel>
      </AccordionItem>
    </Accordion>
  );
} 