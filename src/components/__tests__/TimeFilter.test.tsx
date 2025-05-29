import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import TimeFilter from '../TimeFilter';
import { TimeFilter as TimeFilterType } from '../../types';
import '@testing-library/jest-dom';

describe('TimeFilter', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  const renderWithChakra = (component: React.ReactElement) => {
    return render(
      <ChakraProvider>
        {component}
      </ChakraProvider>
    );
  };

  it('renders all time filter options', () => {
    renderWithChakra(<TimeFilter value="7d" onChange={mockOnChange} />);
    
    expect(screen.getByText('1 Day')).toBeInTheDocument();
    expect(screen.getByText('7 Days')).toBeInTheDocument();
    expect(screen.getByText('30 Days')).toBeInTheDocument();
  });

  it('highlights the selected filter', () => {
    renderWithChakra(<TimeFilter value="7d" onChange={mockOnChange} />);
    
    const selectedButton = screen.getByText('7 Days').closest('button');
    const unselectedButton = screen.getByText('1 Day').closest('button');

    expect(selectedButton).toHaveAttribute('data-active');
  });

  it('calls onChange when a filter is clicked', () => {
    renderWithChakra(<TimeFilter value="7d" onChange={mockOnChange} />);
    
    fireEvent.click(screen.getByText('30 Days'));
    expect(mockOnChange).toHaveBeenCalledWith('30d');
  });
}); 