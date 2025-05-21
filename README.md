# Developer Metrics Dashboard

A lightweight dashboard that displays GitHub-based engineering metrics grouped by team. Built with Next.js and deployed on Vercel.

## Features

- Display team-based metrics:
  - Number of PRs Merged
  - Average PR Cycle Time
  - Number of PRs Reviewed
- Filter metrics by time period (1 day, 7 days, 30 days)
- Auto-refresh metrics hourly
- Responsive design for mobile and desktop

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up GitHub App authentication:
   - Go to your GitHub App settings
   - Generate a new private key
   - Create the file `src/key/key.pem` and paste the private key content
   - Update `.env.local` with your GitHub App details:
     ```
     GITHUB_APP_ID=YOUR_APP_ID_HERE
     GITHUB_INSTALLATION_ID=YOUR_INSTALLATION_ID_HERE
     ```
4. Update the team mapping in `public/data/team-mapping.csv`

## Development

Run the development server:
```bash
npm run dev
```

## Testing

Run tests:
```bash
npm test
```

Watch mode:
```bash
npm run test:watch
```

## Build

Build for production:
```bash
npm run build
```

## Deployment

The project is configured for deployment on Vercel. Connect your GitHub repository to Vercel for automatic deployments.

## Environment Variables

- `GITHUB_APP_ID`: Your GitHub App ID (fill in your own)
- `GITHUB_INSTALLATION_ID`: Your GitHub App Installation ID (fill in your own)
- `GITHUB_PRIVATE_KEY_PATH`: Path to your GitHub App private key (default: src/key/key.pem) 