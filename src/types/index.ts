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
}

export type TimeFilter = '1d' | '7d' | '30d';

export interface GitHubMetrics {
  mergedPRs: number;
  avgCycleTime: number;
  reviewedPRs: number;
  openPRs: number;
  commits: number;
} 