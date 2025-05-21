import { NextResponse } from 'next/server';
import { parse } from 'csv-parse/sync';
import { TeamMember } from '@/types';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const csvPath = path.join(process.cwd(), 'public', 'data', 'team-mapping.csv');
    const fileContent = fs.readFileSync(csvPath, 'utf-8');
    
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
    });

    const teamMembers: TeamMember[] = records.map((record: any) => ({
      githubUsername: record.github_username,
      teamName: record.team_name,
    }));

    return NextResponse.json(teamMembers);
  } catch (error) {
    console.error('Error loading team mapping:', error);
    return NextResponse.json(
      { error: 'Failed to load team mapping' },
      { status: 500 }
    );
  }
} 