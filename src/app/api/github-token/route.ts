import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import fetch from 'node-fetch';

const APP_ID = process.env.GITHUB_APP_ID || '1302931';
const INSTALLATION_ID = process.env.GITHUB_INSTALLATION_ID || '67654311';

export async function GET() {
  try {
    // Step 1: Read env vars
    console.error('[TokenGen] Step 1: ENV DEBUG:', {
      GITHUB_PRIVATE_KEY: process.env.GITHUB_PRIVATE_KEY ? 'set' : 'not set',
      GITHUB_APP_ID: process.env.GITHUB_APP_ID,
      GITHUB_INSTALLATION_ID: process.env.GITHUB_INSTALLATION_ID,
      NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
      NODE_ENV: process.env.NODE_ENV,
    });

    // Step 2: Read private key
    const privateKey = process.env.GITHUB_PRIVATE_KEY;
    if (!privateKey) {
      console.error('[TokenGen] Step 2: Private key not set');
      return NextResponse.json({ error: 'GITHUB_PRIVATE_KEY env var not set' }, { status: 500 });
    }
    console.error('[TokenGen] Step 2: Private key is set');

    // Step 3: Create JWT
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const payload = {
      iat: currentTimestamp - 60, // Start 1 minute ago
      exp: currentTimestamp + (10 * 60), // Expire in 10 minutes
      iss: APP_ID,
    };
    let jwtToken;
    try {
      jwtToken = jwt.sign(payload, privateKey, { algorithm: 'RS256' });
      console.error('[TokenGen] Step 3: JWT created with exp:', new Date(payload.exp * 1000).toISOString());
    } catch (err) {
      console.error('[TokenGen] Step 3: JWT creation failed', err);
      return NextResponse.json({ error: 'JWT creation failed: ' + (err instanceof Error ? err.message : String(err)) }, { status: 500 });
    }

    // Step 4: Exchange JWT for installation access token
    const url = `https://api.github.com/app/installations/${INSTALLATION_ID}/access_tokens`;
    console.error('[TokenGen] Step 4: Requesting installation token from', url);
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${jwtToken}`,
        Accept: 'application/vnd.github+json',
      },
    });

    if (!res.ok) {
      const error = await res.text();
      console.error('[TokenGen] Step 4: GitHub API error', { status: res.status, error });
      return NextResponse.json({ error }, { status: res.status });
    }

    const data = await res.json();
    const expiresAt = new Date(data.expires_at);
    const currentTime = new Date();
    const minutesUntilExpiry = Math.round((expiresAt.getTime() - currentTime.getTime()) / (60 * 1000));
    
    console.error('[TokenGen] Step 5: Installation token received:', {
      expiresAt: data.expires_at,
      minutesUntilExpiry,
      tokenPresent: !!data.token
    });

    if (expiresAt <= currentTime) {
      console.error('[TokenGen] Step 5: Warning - Token expired on creation');
      return NextResponse.json({ error: 'Token expired on creation' }, { status: 500 });
    }

    return NextResponse.json({ token: data.token, expires_at: data.expires_at });
  } catch (error) {
    console.error('[TokenGen] Step 6: Unexpected error', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
} 