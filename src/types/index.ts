export interface TeamMember {
  githubUsername: string;
  teamName: string;
}

export interface TeamMetrics {
  teamName: string;
  mergedPRs: number;
  avgCycleTime: number;
  reviewedPRs: number;
  openPRs: number;
  commits: number;
  prsPerPerson: number;
  totalMembers: number;
  // New average metrics for teams
  avgAdditionsPerPR: number;
  avgDeletionsPerPR: number;
  avgFilesChangedPerPR: number;
}

export type TimeFilter = '1d' | '7d' | '30d';

export interface GitHubMetrics {
  mergedPRs: number;
  avgCycleTime: number;
  reviewedPRs: number;
  openPRs: number;
  commits: number;
  // New total and average metrics for users
  totalAdditions: number;
  totalDeletions: number;
  totalChangedFiles: number;
  avgAdditionsPerPR: number;
  avgDeletionsPerPR: number;
  avgFilesChangedPerPR: number;
}

// Interface for individual Pull Request data, including new fields
export interface PullRequest {
  author: string;
  reviewers: string[];
  createdAt: string;
  mergedAt: string | null;
  closedAt: string | null;
  state: string;
  merged: boolean;
  commits: number;
  additions: number;
  deletions: number;
  changedFiles: number;
}
