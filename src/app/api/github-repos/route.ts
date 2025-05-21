import { NextResponse } from 'next/server';
import { getNammayatriRepos } from '@/lib/github-app-graphql';

export async function GET() {
  try {
    const repos = await getNammayatriRepos();
    return NextResponse.json({ repos });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
} 