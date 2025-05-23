import fetch from 'node-fetch';

// Helper to get a fresh installation token from your API route
let tokenCache: { token: string; expiresAt: string } | null = null;

async function getGithubAppToken(forceRefresh: boolean = false) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
  console.log('baseUrl is this: ', baseUrl);
  if (!baseUrl) {
    throw new Error('NEXT_PUBLIC_BASE_URL environment variable must be set in production');
  }

  // Check if we have a valid cached token and forceRefresh is false
  if (!forceRefresh && tokenCache && new Date(tokenCache.expiresAt) > new Date()) {
    const now = new Date();
    const expiresAt = new Date(tokenCache.expiresAt);
    const minutesUntilExpiry = Math.round((expiresAt.getTime() - now.getTime()) / (60 * 1000));
    console.error('[TokenCache] Using cached token, expires in:', minutesUntilExpiry, 'minutes');
    return tokenCache.token;
  }

  console.error('[TokenGen] Generating new token...');
  console.log(`Calling ${baseUrl}/api/github-token`);
  const res = await fetch(`${baseUrl}/api/github-token`);
  if (!res.ok) {
    const error = await res.text();
    console.error('[TokenGen] Failed to get token:', error);
    throw new Error('Failed to get GitHub App token: ' + error);
  }
  const { token, expires_at } = await res.json();
  
  // Validate expiration time
  const now = new Date();
  const expiresAt = new Date(expires_at);
  if (expiresAt <= now) {
    console.error('[TokenGen] Warning: Received token is already expired:', { expires_at, now: now.toISOString() });
    // Force a new token generation by not caching this one
    return token;
  }
  
  // Update cache
  tokenCache = { token, expiresAt: expires_at };
  const minutesUntilExpiry = Math.round((expiresAt.getTime() - now.getTime()) / (60 * 1000));
  console.error('[TokenGen] New token generated, expires in:', minutesUntilExpiry, 'minutes');
  return token;
}

// Main function to make a GitHub GraphQL API call as the App
export async function githubAppGraphql<T = any>(query: string, variables: Record<string, any> = {}) {
  let token = await getGithubAppToken();
  console.error('[GraphQL] Making API call with token');

  const makeRequest = async (tkn: string) => {
    const res = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tkn}`,
        'Content-Type': 'application/json',
        'User-Agent': 'nammayatri-dashboard-app',
      },
      body: JSON.stringify({ query, variables }),
    });

    if (!res.ok) {
      const error = await res.text();
      const status = res.status;
      console.error('[GraphQL] Request failed:', { status, error });
      // If we get a 4xx error, it might be due to an expired token
      if (status >= 400 && status < 500) {
        console.error('[GraphQL] Got 4xx error, forcing token refresh');
        throw new Error(`FORCE_REFRESH:${error}`);
      }
      throw new Error(`GitHub GraphQL error: ${error}`);
    }

    const data = await res.json();
    if (data.errors) {
      console.error('[GraphQL] GraphQL errors:', data.errors);
      throw new Error(JSON.stringify(data.errors));
    }
    return data.data as T;
  };

  try {
    return await makeRequest(token);
  } catch (error) {
    // If we got a 4xx error, try once more with a fresh token
    if (error instanceof Error && error.message.startsWith('FORCE_REFRESH:')) {
      console.error('[GraphQL] Retrying with fresh token');
      token = await getGithubAppToken(true);
      return await makeRequest(token);
    }
    console.error('[GraphQL] Final error:', error);
    throw error;
  }
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