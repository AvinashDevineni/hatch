# 🚀 AI Code Generator - Setup Instructions

## Quick Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env.local` file in the project root with the following:

```bash
# Neon Database
DATABASE_URL=postgresql://...
POSTGRES_URL=postgresql://...
POSTGRES_URL_NON_POOLING=postgresql://...

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=thehatchagent@gmail.com
SMTP_PASS=theHatchAgent123

# Stack Auth (if using authentication)
NEXT_PUBLIC_STACK_PROJECT_ID=...
NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY=...
STACK_SECRET_SERVER_KEY=...
```

### 3. Install Vercel CLI

The Vercel CLI must be installed on the server for deployments to work:

```bash
npm install -g vercel
```

**Note**: You do NOT need to authenticate the Vercel CLI manually. The system automatically handles authentication through user authorization emails.

### 4. Start the Server

```bash
npm run dev
```

The server will start on `http://0.0.0.0:3000`

## How Deployment Works

The AI Code Generator automatically deploys projects to Vercel with minimal user interaction:

### User Experience

1. User creates a project (enters email + idea)
2. AI builds the application
3. User receives an email with a Vercel authorization link
4. User clicks the link to authorize deployment
5. System automatically completes the deployment
6. User receives a second email with the live URL

### Technical Flow

1. **Project Creation**: User provides email and project description
2. **Code Generation**: AI agent builds the complete application
3. **Database Setup** (if needed): Automatically sets up Neon PostgreSQL
4. **Error Checking**: Runs build and lint commands
5. **Authorization Email**: System runs `vercel login` and emails the authorization URL to user
6. **User Authorization**: User clicks email link and authorizes on Vercel
7. **Auto-Deployment**: Background monitor detects authorization and runs:
   - `vercel link --yes`
   - `vercel --prod --yes`
8. **Success Email**: User receives email with live deployment URL

## Requirements

- Node.js 18+
- Vercel CLI installed globally
- Neon PostgreSQL database (for projects that need databases)
- Gmail account for SMTP email notifications

## Troubleshooting

### Email Not Sending

Check that your `.env.local` has the correct SMTP credentials:
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=thehatchagent@gmail.com
SMTP_PASS=theHatchAgent123
```

### Deployment Failing

1. Check that Vercel CLI is installed: `vercel --version`
2. Check the project logs in `projects/<project-id>/project.json`
3. Ensure the user clicked the authorization email link

### Database Connection Issues

Verify your Neon database credentials in `.env.local` are correct.

## Questions?

- **Q: Do users need Vercel accounts?**
  - A: Yes, users need to have or create a Vercel account when they click the authorization link.

- **Q: Can I use a different email provider?**
  - A: Yes, update the SMTP settings in `.env.local` to use any SMTP provider.

- **Q: What happens if the user never clicks the authorization link?**
  - A: The deployment will remain in "awaiting_authorization" status. The user can request a new deployment.

---

**That's it!** Once the environment variables are configured and the server is running, the AI agent will handle everything automatically.
