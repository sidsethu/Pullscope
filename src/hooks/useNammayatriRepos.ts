import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export function useNammayatriRepos(shouldFetch: boolean) {
  const { data, error, isLoading } = useSWR(
    shouldFetch ? '/api/github-repos' : null,
    fetcher
  );

  return {
    repos: data?.repos || [],
    isLoading,
    isError: !!error,
  };
} 