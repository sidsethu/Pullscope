import { GitHubMetrics, TimeFilter } from '@/types';
import { githubAppGraphql,getGithubAppToken } from './github-app-graphql';

const getDateFromFilter = (filter: TimeFilter): Date => {
  const now = new Date();
  switch (filter) {
    case '1d':
      return new Date(now.setDate(now.getDate() - 1));
    case '7d':
      return new Date(now.setDate(now.getDate() - 7));
    case '30d':
      return new Date(now.setDate(now.getDate() - 30));
  }
};

interface PullRequest {
  author: string;
  reviewers: string[];
  createdAt: string;
  mergedAt: string | null;
  closedAt: string | null;
  state: string;
  merged: boolean;
  commits: number;
}

interface GraphQLResponse {
  search: {
    nodes: Array<{
      author: { login: string };
      reviews: {
        nodes: Array<{ author: { login: string } }>;
      };
      createdAt: string;
      mergedAt: string | null;
      closedAt: string | null;
      state: string;
      merged: boolean;
      commits: {
        totalCount: number;
      };
    }>;
    pageInfo: {
      hasNextPage: boolean;
      endCursor: string | null;
    };
  };
}

type PRNode = GraphQLResponse['search']['nodes'][0];
type ReviewNode = PRNode['reviews']['nodes'][0];

// Cache for PR data
let prCache: {
  data: PullRequest[];
  timestamp: number;
} | null = null;

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

async function fetchAllPRs(): Promise<PullRequest[]> {
  // Always fetch last 30 days of data
  const since = new Date();
  since.setDate(since.getDate() - 30);

  // Check cache first
  if (prCache && Date.now() - prCache.timestamp < CACHE_DURATION) {
    return prCache.data;
  }

  const prs: PullRequest[] = [];
  let hasNextPage = true;
  let cursor: string | null = null;

  while (hasNextPage) {
    const sinceDate = since.toISOString().split('T')[0]; // Format as YYYY-MM-DD
    const query = `
      query($cursor: String) {
        search(
          query: "org:nammayatri is:pr created:>${sinceDate}"
          type: ISSUE
          first: 100
          after: $cursor
        ) {
          nodes {
            ... on PullRequest {
              author {
                login
              }
              reviews(first: 100) {
                nodes {
                  author {
                    login
                  }
                }
              }
              createdAt
              mergedAt
              closedAt
              state
              merged
              commits {
                totalCount
              }
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    `;

    const response: GraphQLResponse = await githubAppGraphql<GraphQLResponse>(query, { cursor });
    
    const { search: searchResults } = response;

    prs.push(...searchResults.nodes.map((pr: PRNode) => ({
      author: pr.author.login,
      reviewers: Array.from(new Set(pr.reviews.nodes.map((review: ReviewNode) => review.author.login))),
      createdAt: pr.createdAt,
      mergedAt: pr.mergedAt,
      closedAt: pr.closedAt,
      state: pr.state,
      merged: pr.merged,
      commits: pr.commits.totalCount
    })));

    hasNextPage = searchResults.pageInfo.hasNextPage;
    cursor = searchResults.pageInfo.endCursor;
  }

  // Update cache
  prCache = {
    data: prs,
    timestamp: Date.now()
  };

  return prs;
}

function filterPRsByTimeRange(prs: PullRequest[], timeFilter: TimeFilter): PullRequest[] {
  const cutoffDate = getDateFromFilter(timeFilter);
  return prs.filter(pr => {
    const prDate = new Date(pr.createdAt);
    return prDate >= cutoffDate;
  });
}

function filterCommitsByTimeRange(commits: { date: string }[], timeFilter: TimeFilter): { date: string }[] {
  const cutoffDate = getDateFromFilter(timeFilter);
  return commits.filter(commit => {
    const commitDate = new Date(commit.date);
    return commitDate >= cutoffDate;
  });
}

// Configurable threshold for open PRs (in days)
const OPEN_PR_AGE_THRESHOLD_DAYS = 5;

export function calculateUserMetrics(
  username: string,
  prs: PullRequest[]
): GitHubMetrics {
  // Filter PRs authored by the user
  const authoredPRs = prs.filter(pr => pr.author === username && pr.merged);
  
  // Calculate average cycle time
  let totalCycleTime = 0;
  authoredPRs.forEach(pr => {
    if (pr.mergedAt) {
      const createdAt = new Date(pr.createdAt);
      const mergedAt = new Date(pr.mergedAt);
      totalCycleTime += mergedAt.getTime() - createdAt.getTime();
    }
  });

  const avgCycleTime = authoredPRs.length > 0
    ? totalCycleTime / authoredPRs.length / (1000 * 60 * 60) // Convert to hours
    : 0;

  // Count PRs reviewed by the user
  const reviewedPRs = prs.filter(pr => 
    pr.reviewers.includes(username) && 
    pr.author !== username // Don't count self-reviews
  ).length;

  // Count open PRs authored by the user that are open for more than the threshold
  const now = new Date();
  const openPRs = prs.filter(pr => {
    if (pr.author !== username) return false;
    if (pr.state !== 'OPEN') return false;
    const createdAt = new Date(pr.createdAt);
    const ageDays = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
    return ageDays > OPEN_PR_AGE_THRESHOLD_DAYS;
  }).length;

  // Calculate total commits from merged PRs
  const totalCommits = authoredPRs.reduce((sum, pr) => sum + pr.commits, 0);

  return {
    mergedPRs: authoredPRs.length,
    avgCycleTime,
    reviewedPRs,
    openPRs,
    commits: totalCommits,
  };
}

export async function fetchAllMetrics(timeFilter: TimeFilter): Promise<Record<string, GitHubMetrics>> {
  const allPRs = await fetchAllPRs();
  const filteredPRs = filterPRsByTimeRange(allPRs, timeFilter);
  
  // Get unique usernames from PRs
  const usernames = Array.from(new Set([
    ...filteredPRs.map(pr => pr.author),
    ...filteredPRs.flatMap(pr => pr.reviewers)
  ]));
  const metrics: Record<string, GitHubMetrics> = {};
  
  // Calculate metrics for each user
  for (const username of usernames) {
    metrics[username] = calculateUserMetrics(username, filteredPRs);
  }

  return metrics;
}

export async function fetchTotalCommitsForOrgWithAppAuth(
  org: string,
  timeFilter: TimeFilter
): Promise<{
  commits: Record<string, number>;
  repos: Record<string, number>;
}> {
  let hasNextRepoPage = true;
  let repoEndCursor = null;
  const userCommits: Record<string, number> = {};
  const repoCommits: Record<string, number> = {};
  const sinceDate = getDateFromFilter(timeFilter).toISOString().split('T')[0];

  const repoListQuery = `
    query($org: String!, $after: String, $commitAfter: String) {
      organization(login: $org) {
        repositories(first: 20, after: $after, isFork: false, ownerAffiliations: OWNER) {
          nodes {
            name
            defaultBranchRef {
              name
              target {
                ... on Commit {
                  history(since: "${sinceDate}T00:00:00Z", first: 100, after: $commitAfter) {
                    edges {
                      node {
                        author {
                          user {
                            login
                          }
                        }
                      }
                    }
                    pageInfo {
                      hasNextPage
                      endCursor
                    }
                  }
                }
              }
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    }
  `;

  while (hasNextRepoPage) {
    let hasNextCommitPage = true;
    let commitEndCursor = null;

    while (hasNextCommitPage) {
      const variables: { org: string; after: string | null; commitAfter: string | null } = { 
        org, 
        after: repoEndCursor,
        commitAfter: commitEndCursor 
      };
      const json = await githubAppGraphql(repoListQuery, variables);

      if (json.errors) {
        throw new Error('GitHub GraphQL error: ' + JSON.stringify(json.errors));
      }

      const repos = json.organization.repositories.nodes;
      for (const repo of repos) {
        const history = repo.defaultBranchRef?.target?.history;
        if (history) {
          const edges = history.edges ?? [];
          // Count commits per repo
          repoCommits[repo.name] = (repoCommits[repo.name] || 0) + edges.length;
          
          for (const edge of edges) {
            const login = edge.node.author?.user?.login;
            if (login) {
              userCommits[login] = (userCommits[login] || 0) + 1;
            }
          }
          hasNextCommitPage = history.pageInfo.hasNextPage;
          commitEndCursor = history.pageInfo.endCursor;
        }
      }

      if (!hasNextCommitPage) {
        hasNextRepoPage = json.organization.repositories.pageInfo.hasNextPage;
        repoEndCursor = json.organization.repositories.pageInfo.endCursor;
      }
    }
  }
  return {
    commits: Object.fromEntries(
      Object.entries(userCommits)
        .sort(([, a], [, b]) => b - a)
    ),
    repos: Object.fromEntries(
      Object.entries(repoCommits)
        .sort(([, a], [, b]) => b - a)
    )
  }
}

function getDateFromFilterString(filter: TimeFilter): string {
  const now = new Date();
  switch (filter) {
    case '1d':
      now.setDate(now.getDate() - 1);
      break;
    case '7d':
      now.setDate(now.getDate() - 7);
      break;
    case '30d':
      now.setDate(now.getDate() - 30);
      break;
  }
  return now.toISOString().split('T')[0];
} 