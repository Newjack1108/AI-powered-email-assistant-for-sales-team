# Railway Deployment Guide

This guide will help you deploy your Sales Email Assistant to Railway.

## Prerequisites

1. A Railway account (sign up at https://railway.app)
2. A GitHub account (or GitLab/Bitbucket)
3. Your OpenAI API key
4. Your Outlook SMTP credentials

## Step 1: Prepare Your Code

### 1.1 Push to GitHub

1. Initialize git (if not already done):
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   ```

2. Create a new repository on GitHub

3. Push your code:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
   git branch -M main
   git push -u origin main
   ```

## Step 2: Deploy to Railway

### 2.1 Create New Project

1. Go to https://railway.app
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your repository
5. Railway will automatically detect it's a Next.js app

### 2.2 Configure Environment Variables

In Railway, go to your project → Variables tab and add:

**Required:**
```
OPENAI_API_KEY=your_openai_api_key_here
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_USER=your_email@outlook.com
SMTP_PASSWORD=your_email_password
SMTP_FROM_NAME=Sales Team
```

**Optional:**
```
MAKE_WEBHOOK_URL=https://hook.us1.make.com/your_webhook_url
NODE_ENV=production
PORT=3000
```

### 2.3 Important: Database and File Storage

⚠️ **Railway has ephemeral storage** - files and SQLite database will be lost on redeploy.

**Options:**

**Option A: Use Railway PostgreSQL (Recommended)**
- Add PostgreSQL service in Railway
- Update database connection (see below)

**Option B: Use External Database**
- Use a service like Supabase, PlanetScale, or MongoDB Atlas
- Update connection strings

**Option C: Keep SQLite (Not Recommended)**
- Files will be lost on redeploy
- Only for testing

### 2.4 File Uploads

Since Railway has ephemeral storage, uploaded files will be lost. Consider:
- Using AWS S3, Cloudinary, or similar
- Or accept that uploads are temporary

## Step 3: Update Database Configuration (If Using PostgreSQL)

If you want to use PostgreSQL instead of SQLite, you'll need to update the database connection.

## Step 4: Deploy

1. Railway will automatically build and deploy
2. Check the Deployments tab for build logs
3. Once deployed, Railway will provide a URL like: `https://your-app.railway.app`

## Step 5: Custom Domain (Optional)

1. Go to Settings → Domains
2. Add your custom domain
3. Railway will provide DNS instructions

## Troubleshooting

### Build Fails
- Check build logs in Railway
- Ensure all dependencies are in package.json
- Check Node.js version compatibility

### Database Issues
- SQLite won't persist on Railway
- Consider PostgreSQL or external database

### File Upload Issues
- Railway has ephemeral storage
- Use external storage service

### Environment Variables Not Working
- Ensure variables are set in Railway dashboard
- Restart deployment after adding variables

## Next Steps After Deployment

1. Test the application
2. Set up custom domain (if needed)
3. Configure database (if using external)
4. Set up file storage (if needed)
5. Monitor logs in Railway dashboard


