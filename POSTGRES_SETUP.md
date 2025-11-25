# PostgreSQL Setup Guide for Railway

## Step-by-Step Instructions

### Step 1: Add PostgreSQL Service in Railway

1. **Go to your Railway project dashboard**
2. **Click the "+ New" button** (or "+" icon)
3. **Select "Database"** from the dropdown
4. **Choose "Add PostgreSQL"**
5. Railway will automatically create a PostgreSQL database for you

### Step 2: Railway Automatically Sets DATABASE_URL

- Railway will automatically add a `DATABASE_URL` environment variable
- This variable contains the connection string to your PostgreSQL database
- You don't need to manually set this - Railway does it for you!

### Step 3: Verify Environment Variable

1. In Railway, go to your **project → Variables** tab
2. You should see `DATABASE_URL` automatically added
3. It will look something like: `postgresql://postgres:password@hostname:5432/railway`

### Step 4: Redeploy Your Application

1. Railway should automatically detect the new `DATABASE_URL` variable
2. Your app will automatically switch from SQLite to PostgreSQL
3. The database tables will be created automatically on first run

### Step 5: Test Your Application

1. Once deployed, visit your Railway app URL
2. Try creating a template or sending an email
3. Check the History page - your data should be saved in PostgreSQL now!

## How It Works

The app automatically detects which database to use:

- **If `DATABASE_URL` exists** (Railway production) → Uses PostgreSQL
- **If `DATABASE_URL` doesn't exist** (local development) → Uses SQLite

This means:
- ✅ Your local development still works with SQLite
- ✅ Your Railway deployment automatically uses PostgreSQL
- ✅ No code changes needed - it's automatic!

## Troubleshooting

### Database Connection Errors

If you see connection errors:
1. Check that PostgreSQL service is running in Railway
2. Verify `DATABASE_URL` is set in Variables
3. Check Railway logs for detailed error messages

### Tables Not Created

The tables are created automatically on first API call. If they're not created:
1. Check Railway logs for errors
2. Make sure the PostgreSQL service is running
3. Try accessing the app - it will trigger table creation

## Next Steps

Once PostgreSQL is set up:
- Your data will persist across deployments
- You can view your database in Railway's PostgreSQL dashboard
- All emails and templates will be saved permanently

