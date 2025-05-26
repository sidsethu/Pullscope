import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Add cache control headers
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');

    // Add these logs to see the full token creation process
    console.log('Starting token creation process');
    console.log('Request headers:', JSON.stringify(req.headers, null, 2));
    console.log('Request body:', JSON.stringify(req.body, null, 2));

    // Force new token generation
    const response = await fetch('https://api.github.com/app/installations/ACCESS_TOKEN_ID/access_tokens', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GITHUB_APP_PRIVATE_KEY}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!response.ok) {
      console.error('GitHub API error:', await response.text());
      return res.status(500).json({ error: 'Failed to generate new token' });
    }

    const data = await response.json();
    console.log('New token generated with expiration:', data.expires_at);

    return res.status(200).json(data);
  } catch (error) {
    console.error('Error creating token:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 