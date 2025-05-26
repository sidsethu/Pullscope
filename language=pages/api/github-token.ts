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

    // Add these logs to see the full token creation process
    console.log('Starting token creation process');
    console.log('Request headers:', JSON.stringify(req.headers, null, 2));
    console.log('Request body:', JSON.stringify(req.body, null, 2));

    // Your token creation logic here
    const token = process.env.GITHUB_TOKEN; // or however you're creating the token

    if (!token) {
      return res.status(500).json({ error: 'Failed to create token' });
    }

    // After token creation
    console.log('Token creation response:', { token: '***' }); // Don't log the actual token

    return res.status(200).json({ token });
  } catch (error) {
    console.error('Error creating token:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 