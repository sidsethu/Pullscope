import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import fetch from 'node-fetch';

const APP_ID = process.env.GITHUB_APP_ID || '1302931';
const INSTALLATION_ID = process.env.GITHUB_INSTALLATION_ID || '67654311';

export async function GET() {
  try {
    // Debugging: Print env variable status
    console.log('PRIVATE_KEY:', process.env.GITHUB_PRIVATE_KEY);
    console.log('APP_ID:', process.env.GITHUB_APP_ID);
    console.log('INSTALLATION_ID:', process.env.GITHUB_INSTALLATION_ID);

    // 1. Read private key from environment variable
    const privateKey = process.env.GITHUB_PRIVATE_KEY;
    if (!privateKey) {
      return NextResponse.json({ error: 'GITHUB_PRIVATE_KEY env var not set' }, { status: 500 });
    }

    // 2. Create JWT
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iat: now - 60,
      exp: now + (10 * 60),
      iss: APP_ID,
    };
    const jwtToken = jwt.sign(payload, privateKey, { algorithm: 'RS256' });

    // 3. Exchange JWT for installation access token
    const res = await fetch(`https://api.github.com/app/installations/${INSTALLATION_ID}/access_tokens`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${jwtToken}`,
        Accept: 'application/vnd.github+json',
      },
    });

    if (!res.ok) {
      const error = await res.text();
      return NextResponse.json({ error }, { status: 500 });
    }

    const data = await res.json();
    return NextResponse.json({ token: data.token, expires_at: data.expires_at });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
} 