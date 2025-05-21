import fetch from 'node-fetch';

// Helper to get a fresh installation token from your API route
async function getGithubAppToken() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
  if (!baseUrl) {
    throw new Error('NEXT_PUBLIC_BASE_URL environment variable must be set in production');
  }
  const res = await fetch(`${baseUrl}/api/github-token`);
  if (!res.ok) throw new Error('Failed to get GitHub App token');
  const { token } = await res.json();
  return token;
}

// Main function to make a GitHub GraphQL API call as the App
export async function githubAppGraphql<T = any>(query: string, variables: Record<string, any> = {}) {
  const token = await getGithubAppToken();

  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'User-Agent': 'nammayatri-dashboard-app',
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`GitHub GraphQL error: ${error}`);
  }

  const data = await res.json();
  if (data.errors) throw new Error(JSON.stringify(data.errors));
  return data.data as T;
}

// Example: Get all repos in the 'nammayatri' org
export async function getNammayatriRepos() {
  const query = `
    query($org: String!, $cursor: String) {
      organization(login: $org) {
        repositories(first: 100, after: $cursor) {
          nodes {
            name
            url
            description
            isPrivate
            createdAt
            updatedAt
          }
          pageInfo {
            endCursor
            hasNextPage
          }
        }
      }
    }
  `;

  let repos: any[] = [];
  let cursor: string | null = null;
  let hasNextPage = true;

  while (hasNextPage) {
    type OrgReposResponse = {
      organization: {
        repositories: {
          nodes: Array<{
            name: string;
            url: string;
            description: string;
            isPrivate: boolean;
            createdAt: string;
            updatedAt: string;
          }>;
          pageInfo: {
            endCursor: string | null;
            hasNextPage: boolean;
          };
        };
      };
    };
    const data: OrgReposResponse = await githubAppGraphql<OrgReposResponse>(query, { org: 'nammayatri', cursor });
    const repoNodes = data.organization.repositories.nodes;
    repos = repos.concat(repoNodes);

    const pageInfo: OrgReposResponse["organization"]["repositories"]["pageInfo"] = data.organization.repositories.pageInfo;
    cursor = pageInfo.endCursor;
    hasNextPage = pageInfo.hasNextPage;
  }

  return repos;
} 