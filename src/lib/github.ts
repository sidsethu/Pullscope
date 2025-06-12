import { GitHubMetrics, TimeFilter, PullRequest as PullRequestType } from '@/types'; // Import PullRequestType
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

// Remove local PullRequest interface, will use PullRequestType from @/types

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
      // New fields for PR stats
      additions: number;
      deletions: number;
      changedFiles: number;
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
let prCache: Record<string, { data: PullRequestType[]; timestamp: number; }> = {}; // Use PullRequestType

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

async function fetchAllPRs(timeFilter: TimeFilter): Promise<PullRequestType[]> { // Use PullRequestType
  const since = getDateFromFilter(timeFilter);

  // Check cache first
  const cacheKey = since.toISOString(); // Using ISO string of the 'since' date as cache key
  if (prCache[cacheKey] && Date.now() - prCache[cacheKey].timestamp < CACHE_DURATION) {
    console.log(`[Cache] Using cached PRs for filter: ${timeFilter} (since: ${cacheKey})`);
    return prCache[cacheKey].data;
  }
  console.log(`[Cache] Fetching fresh PRs for filter: ${timeFilter} (since: ${cacheKey})`);

  const prs: PullRequestType[] = []; // Use PullRequestType
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
              # Request new fields
              additions
              deletions
              changedFiles
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
      commits: pr.commits.totalCount,
      // Map new fields
      additions: pr.additions,
      deletions: pr.deletions,
      changedFiles: pr.changedFiles
    })));

    hasNextPage = searchResults.pageInfo.hasNextPage;
    cursor = searchResults.pageInfo.endCursor;
  }

  // Update cache
  prCache[cacheKey] = {
    data: prs,
    timestamp: Date.now()
  };

  return prs;
}

// filterPRsByTimeRange is likely redundant now as fetchAllPRs fetches data for the specific timeFilter.
// Keeping it commented out for now, can be removed if confirmed redundant after testing.
/*
function filterPRsByTimeRange(prs: PullRequest[], timeFilter: TimeFilter): PullRequest[] {
  const cutoffDate = getDateFromFilter(timeFilter);
  return prs.filter(pr => {
    const prDate = new Date(pr.createdAt);
    return prDate >= cutoffDate;
  });
}
*/

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
  prs: PullRequestType[] // Use PullRequestType
): GitHubMetrics {
  // Filter PRs authored by the user that are merged
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

  // Calculate total additions, deletions, and changed files from merged PRs
  const totalAdditions = authoredPRs.reduce((sum, pr) => sum + pr.additions, 0);
  const totalDeletions = authoredPRs.reduce((sum, pr) => sum + pr.deletions, 0);
  const totalChangedFiles = authoredPRs.reduce((sum, pr) => sum + pr.changedFiles, 0);

  const mergedPRsCount = authoredPRs.length;

  return {
    mergedPRs: mergedPRsCount,
    avgCycleTime,
    reviewedPRs,
    openPRs,
    commits: totalCommits,
    totalAdditions,
    totalDeletions,
    totalChangedFiles,
    avgAdditionsPerPR: mergedPRsCount > 0 ? totalAdditions / mergedPRsCount : 0,
    avgDeletionsPerPR: mergedPRsCount > 0 ? totalDeletions / mergedPRsCount : 0,
    avgFilesChangedPerPR: mergedPRsCount > 0 ? totalChangedFiles / mergedPRsCount : 0,
  };
}

export async function fetchAllMetrics(timeFilter: TimeFilter): Promise<Record<string, GitHubMetrics>> {
  // Fetch PRs specifically for the given timeFilter
  const prsForFilter = await fetchAllPRs(timeFilter); // prsForFilter is now PullRequestType[]
  
  // Get unique usernames from PRs
  // Note: filterPRsByTimeRange was removed as fetchAllPRs now handles the date range.
  const usernames = Array.from(new Set([
    ...prsForFilter.map(pr => pr.author),
    ...prsForFilter.flatMap(pr => pr.reviewers)
  ]));
  const metrics: Record<string, GitHubMetrics> = {};
  
  // Calculate metrics for each user using the already filtered PRs
  for (const username of usernames) {
    metrics[username] = calculateUserMetrics(username, prsForFilter);
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
