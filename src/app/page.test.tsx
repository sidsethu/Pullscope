import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Home from './page';

// Mock fetch for /api/total-commits
beforeAll(() => {
  global.fetch = jest.fn().mockImplementation((url) => {
    if (url.toString().includes('/api/total-commits')) {
      return Promise.resolve({
        json: () => Promise.resolve({ commits: { repos: { repo1: 5, repo2: 3 } } }),
      });
    }
    return Promise.resolve({ json: () => Promise.resolve({}) });
  });
});

afterAll(() => {
  jest.resetAllMocks();
});

describe('Home page dashboard view toggling', () => {
  it('removes 30d filter and toggles button label when switching to repo view', async () => {
    render(<Home />);

    // Select 30d filter
    fireEvent.click(screen.getByText('30 Days'));
    expect(screen.getByText('30 Days').closest('button')).toHaveAttribute('data-active');

    // Click Watch commits by repo
    fireEvent.click(screen.getByText('Watch commits by repo'));

    // Wait for repo view to load
    await waitFor(() => {
      expect(screen.getByText('See all metrics')).toBeInTheDocument();
    });

    // 30d should be removed, 7d should be active
    expect(screen.getByText('7 Days').closest('button')).toHaveAttribute('data-active');
    expect(screen.queryByText('30 Days')?.closest('button')).not.toHaveAttribute('data-active');

    // Click See all metrics to return
    fireEvent.click(screen.getByText('See all metrics'));
    expect(screen.getByText('Watch commits by repo')).toBeInTheDocument();
  });
}); 