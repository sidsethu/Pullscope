import { ButtonGroup, Button } from '@chakra-ui/react';
import { TimeFilter as TimeFilterType } from '@/types';

interface TimeFilterProps {
  value: TimeFilterType;
  onChange: (value: TimeFilterType) => void;
  hide30d?: boolean;
}

const timeFilters: { label: string; value: TimeFilterType }[] = [
  { label: '1 Day', value: '1d' },
  { label: '7 Days', value: '7d' },
  { label: '30 Days', value: '30d' },
];

export default function TimeFilter({ value, onChange, hide30d = false }: TimeFilterProps) {
  return (
    <ButtonGroup size="sm" isAttached variant="outline">
      {timeFilters
        .filter((filter) => !(hide30d && filter.value === '30d'))
        .map((filter) => (
          <Button
            key={filter.value}
            onClick={() => onChange(filter.value)}
            variant={value === filter.value ? 'solid' : 'outline'}
            colorScheme={value === filter.value ? 'blue' : 'gray'}
            data-active={value === filter.value ? true : undefined}
          >
            {filter.label}
          </Button>
        ))}
    </ButtonGroup>
  );
} 