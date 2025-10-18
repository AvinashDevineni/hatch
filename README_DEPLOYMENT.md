# 🚀 Automatic Vercel Deployment - Quick Start

## ⚡ TL;DR - Get Started in 2 Steps

### Step 1: Install Vercel CLI

```bash
npm install -g vercel
```

### Step 2: Start the Server

```bash
npm run dev
```

**That's it!** Now when users create projects, the AI will automatically:
- Build the app
- Set up database if needed
- Check for errors
- Send deployment authorization email to user
- Auto-deploy after user authorizes
- Send live URL to user

**Note**: You do NOT need to run `vercel login` manually. The system handles authentication automatically through user authorization emails.

---

## 📋 Complete Workflow

### What Happens Automatically

When a user creates a project:

```
1. User enters email + idea → "Create Project"
        ↓
2. AI builds complete application
        ↓
3. AI detects if database needed → sets up Neon
        ↓
4. AI checks for errors (build/lint)
        ↓
5. AI runs: vercel login (generates authorization URL)
        ↓
6. System emails user: "Click to authorize deployment"
        ↓
7. User clicks email link → authorizes on Vercel
        ↓
8. Background monitor detects authorization
        ↓
9. System runs: vercel link --yes && vercel --prod --yes
        ↓
10. System emails user: "Your app is live! [URL]"
```

### User Experience

**Users only do 2 things:**
1. Enter their idea (and email)
2. Click one email link to authorize

**Everything else is automated!**

---

## 🔍 Verification

When you start the server, you should see:

```
✓ Server starting on http://0.0.0.0:3000
✓ Projects directory: /Users/you/ai-code-generator/projects
✓ Deployment monitor started
```

---

## ❌ Troubleshooting

### Issue: "command not found: vercel"

**Solution:**
```bash
npm install -g vercel
```

### Issue: No email received

**Symptom:** User created a project but didn't receive authorization email

**Solution:**
1. Check `.env.local` has correct SMTP credentials
2. Check spam folder
3. Verify email was entered correctly during project creation

### Issue: Deployment never completes

**Symptom:** User clicked authorization link but deployment stuck

**Solution:**
1. Check deployment monitor is running (should see `✓ Deployment monitor started` on server startup)
2. Check project metadata file: `projects/<project-id>/project.json` for status
3. Restart the server to restart the deployment monitor

---

## 🎯 Commands Reference

| Command | Purpose |
|---------|---------|
| `npm install -g vercel` | Install Vercel CLI globally (one-time) |
| `vercel --version` | Verify Vercel CLI is installed |
| `npm run dev` | Start the AI Code Generator server |

---

## ✅ Confirmation Checklist

Before creating projects with auto-deployment:

- [ ] Vercel CLI installed (`npm install -g vercel`)
- [ ] Email credentials in `.env.local` are correct
- [ ] Database credentials in `.env.local` are correct (if using databases)
- [ ] Server shows "✓ Deployment monitor started" on startup

---

## 🎉 You're Ready!

Once the checklist above is complete, you can create projects and the AI will automatically handle the entire deployment process!

**Test it:**
1. Go to http://localhost:3000
2. Create a new project (e.g., "simple counter app")
3. Enter your email
4. Wait for AI to build
5. Check your email for authorization link
6. Click it to authorize
7. Wait ~30-60 seconds
8. Get second email with live URL!

---

## 🔄 How It Works

The deployment system uses a two-step authorization process:

1. **Server-side authorization request**: When a project is ready to deploy, the server runs `vercel login` which generates a unique authorization URL
2. **User authorization**: The URL is emailed to the user, who clicks it to authorize the deployment to their Vercel account
3. **Automatic completion**: Once authorized, the background monitor completes the deployment automatically

This ensures that:
- Users maintain control over what gets deployed to their Vercel account
- No manual server-side authentication is needed
- Each project can be deployed to different user accounts
- The process is secure and user-friendly

---

For more details, see `SETUP.md` and `docs/DEPLOYMENT_INTEGRATION.md`
