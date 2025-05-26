export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Add these logs to see the full token creation process
    console.log('Starting token creation process');

    // Your token creation logic here
    const response = await fetch('https://api.github.com/app/installations/ACCESS_TOKEN_ID/access_tokens', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GITHUB_APP_PRIVATE_KEY}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    const responseData = await response.json();
    
    // After token creation
    console.log('Token creation response:', JSON.stringify(responseData, null, 2));

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Error creating token:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 