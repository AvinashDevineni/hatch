# Vercel Deployment and Neon Database Integration

This document describes the integration of Vercel deployments and Neon PostgreSQL database support into the AI Code Generator.

## Overview

The AI Code Generator now includes:
- **Automatic database detection and setup** - Detects if a project needs PostgreSQL support
- **Vercel deployment integration** - Automatically deploys projects to Vercel
- **Email notifications** - Sends deployment status updates via email
- **User email collection** - Collects user email at project creation for notifications

## Features

### 1. Neon Database Setup

The system automatically detects if a project needs database support by checking for:
- Database dependencies in `package.json` (e.g., `pg`, `prisma`, `typeorm`, etc.)
- SQL files (`.sql`, `.prisma`)
- Database configuration files (`drizzle.config.ts`, `prisma/schema.prisma`, etc.)

When database support is detected, the agent:
- Creates a `.env` file in the project with database credentials
- Uses the Neon database credentials from `.env.local`
- Tests the database connection

**Tool:** `setup_database`

### 2. Vercel Deployment

The agent can deploy projects to Vercel production after ensuring there are no errors.

**Deployment workflow:**
1. Check for build/lint errors using `check_for_errors`
2. If no errors found, deploy to production using `deploy_to_vercel`
3. Store deployment URL in project metadata
4. Send email notification to user with deployment link

**Tools:**
- `check_for_errors` - Runs build and lint commands to verify project quality
- `deploy_to_vercel` - Deploys to Vercel production

### 3. Email Notifications

Email notifications are sent for:
- **Deployment success** - Includes the production URL
- **Deployment failure** - Includes error details

**Configuration:**
Email settings are in `.env.local`:
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=thehatchagent@gmail.com
SMTP_PASS=theHatchAgent123
```

### 4. User Email Collection

User email is collected when creating a new project via the New Project modal. The email is:
- Stored in project metadata (`project.json`)
- Used for sending deployment notifications
- Required field when creating a project

## File Structure

### New Files Created

1. **`lib/database-setup.ts`** - Handles Neon database detection and setup
2. **`lib/vercel-deployment.ts`** - Manages Vercel deployment workflow with authorization
3. **`lib/email-notification.ts`** - Sends email notifications via Nodemailer
4. **`lib/project-metadata.ts`** - Manages project metadata and deployment history
5. **`lib/deployment-monitor.ts`** - Background service that monitors and completes pending deployments

### Modified Files

1. **`.env.local`** - Added email credentials
2. **`lib/agent.ts`** - Added new tools for deployment and database setup
3. **`server.ts`** - Added email collection support via WebSocket
4. **`components/NewProjectModal.tsx`** - Added email input field
5. **`app/api/projects/route.ts`** - Stores user email in project metadata

## Usage

### For Developers

When the AI agent builds an application, it will:

1. **Build the application** according to user requirements
2. **Detect database needs** and automatically set up Neon database if required
3. **Check for errors** by running build and lint commands
4. **Deploy to Vercel** if no errors are found
5. **Send email notification** to user with deployment URL

### For Users

When creating a new project:

1. Enter your email address (required)
2. Provide project name (optional)
3. Describe what you want to build
4. Click "Create Project"

The agent will build your application and automatically deploy it to Vercel. You'll receive an email when the deployment is complete with a link to your live application.

## Environment Variables

Required environment variables in `.env.local`:

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

# Other credentials
NEXT_PUBLIC_STACK_PROJECT_ID=...
NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY=...
STACK_SECRET_SERVER_KEY=...
```

## Agent Tools

The agent now has access to these additional tools:

### `setup_database`
- **Description:** Setup Neon PostgreSQL database for the project if needed
- **Auto-detection:** Automatically detects if the project requires database support
- **Usage:** Call this tool after creating database-related files

### `check_for_errors`
- **Description:** Check the project for build errors and lint issues
- **Usage:** Call before deployment to ensure code quality

### `initiate_deployment`
- **Description:** Initiate Vercel deployment process (sends authorization email)
- **Prerequisites:** Must have no build/lint errors
- **Workflow:**
  1. Checks for build/lint errors
  2. Runs `vercel login` to generate authorization URL
  3. Sends authorization email to user with the URL
  4. Marks project as awaiting authorization
- **Result:** Returns success and indicates email was sent
- **Note:** Deployment completes automatically after user authorizes (via DeploymentMonitor)

## Workflow Example

Here's the complete deployment workflow:

```
1. User creates project:
   - Enters email address
   - Describes what they want to build
   - Submits project

2. Agent builds the application:
   - Creates HTML, CSS, JavaScript files
   - Adds database schema and queries if needed
   - Implements all requested features

3. Agent sets up database (if needed):
   - Calls setup_database tool
   - Creates .env file with Neon credentials
   - Tests database connection

4. Agent checks for errors:
   - Calls check_for_errors tool
   - Runs build and lint commands
   - Verifies no errors exist

5. Agent initiates deployment:
   - Calls initiate_deployment tool
   - Runs "vercel link" to generate authorization URL
   - Sends email to user with authorization link

6. User receives authorization email:
   - Email subject: "Action Required: Authorize Vercel Deployment"
   - Contains button/link to authorize
   - Explains what will happen next

7. User clicks authorization link:
   - Opens Vercel authorization page
   - Signs in with Vercel account
   - Authorizes the project

8. Background monitor detects authorization:
   - DeploymentMonitor polls every 30 seconds
   - Detects .vercel folder created (indicates authorization)
   - Automatically completes deployment

9. Deployment completes:
   - Runs "vercel link --yes"
   - Runs "vercel --prod --yes"
   - Stores deployment URL in project metadata

10. User receives deployment success email:
    - Email subject: "Your App is Live!"
    - Contains live deployment URL
    - User can immediately visit their app
```

## Key Points

- **Only ONE manual step**: User clicks authorization link in email
- **Everything else is automatic**: Agent builds, checks, and initiates deployment
- **Background monitoring**: System automatically completes deployment after authorization
- **Two emails sent**:
  1. Authorization request (action required)
  2. Deployment success (informational)

## Notes

- Gmail SMTP is used for email notifications
- Deployment URLs are stored in `project.json` under `deploymentUrl` and `deploymentHistory`
- The system supports both pooled and non-pooled database connections
- Email is required when creating projects to enable deployment notifications
