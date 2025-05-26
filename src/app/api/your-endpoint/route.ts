import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

const GITHUB_APP_ID = process.env.GITHUB_APP_ID;
const GITHUB_INSTALLATION_ID = process.env.GITHUB_INSTALLATION_ID;
const GITHUB_PRIVATE_KEY = process.env.GITHUB_PRIVATE_KEY;

if (!GITHUB_APP_ID) throw new Error('GITHUB_APP_ID is not set');
if (!GITHUB_INSTALLATION_ID) throw new Error('GITHUB_INSTALLATION_ID is not set');
if (!GITHUB_PRIVATE_KEY) throw new Error('GITHUB_PRIVATE_KEY is not set');

const PRIVATE_KEY = GITHUB_PRIVATE_KEY.replace(/\\n/g, '\n');

export async function GET() {
  try {
    // Debug logs
    console.log('GITHUB_APP_ID:', GITHUB_APP_ID);
    console.log('GITHUB_INSTALLATION_ID:', GITHUB_INSTALLATION_ID);
    console.log('GITHUB_PRIVATE_KEY exists:', !!GITHUB_PRIVATE_KEY);
    console.log('GITHUB_PRIVATE_KEY length:', GITHUB_PRIVATE_KEY!.length);

    // 1. Create a JWT for the GitHub App
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iat: now - 60, // issued at time, 60 seconds in the past to allow for clock drift
      exp: now + (10 * 60), // JWT expiration time (10 minute maximum)
      iss: GITHUB_APP_ID,
    };

    const jwtToken = jwt.sign(payload, PRIVATE_KEY, { algorithm: 'RS256' });
    console.log('JWT:', jwtToken.slice(0, 30) + '...');

    // 2. Request a new installation access token
    const githubResponse = await fetch(
      `https://api.github.com/app/installations/${GITHUB_INSTALLATION_ID}/access_tokens`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${jwtToken}`,
          Accept: 'application/vnd.github+json',
        },
      }
    );

    if (!githubResponse.ok) {
      const errorText = await githubResponse.text();
      console.error('GitHub API error:', errorText);
      return NextResponse.json({ error: 'Failed to generate new token', details: errorText }, { status: 500 });
    }

    const data = await githubResponse.json();
    console.log('New token generated with expiration:', data.expires_at);

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error creating token:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 