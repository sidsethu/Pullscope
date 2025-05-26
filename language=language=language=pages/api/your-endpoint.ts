import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Add these logs to see the full token creation process
    console.log('Starting token creation process');
    console.log('Request headers:', JSON.stringify(req.headers, null, 2));
    console.log('Request body:', JSON.stringify(req.body, null, 2));

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

    return res.status(200).json(responseData);
  } catch (error) {
    console.error('Error creating token:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 