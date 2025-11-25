# Step-by-Step Setup Guide

## ✅ Step 1: Install Dependencies (COMPLETED)
The dependencies have been installed successfully. You can ignore the warnings - they're just deprecation notices.

---

## 📝 Step 2: Create Environment Variables File

You need to create a file called `.env.local` in the root of your project (same folder as `package.json`).

**What this file does:** It stores your API keys and email settings securely.

### How to create it:

1. In your project folder (`c:\Users\KelvinNewman\sales-email-assistant`), create a new file named `.env.local`
2. Copy and paste this template into the file:

```env
# OpenAI API Key (REQUIRED for AI email generation)
OPENAI_API_KEY=your_openai_api_key_here

# SMTP Configuration for Outlook/Office365 (REQUIRED for sending emails)
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_USER=your_email@outlook.com
SMTP_PASSWORD=your_email_password
SMTP_FROM_NAME=Sales Team

# Make.com Webhook URL (OPTIONAL - only if you use Make.com)
MAKE_WEBHOOK_URL=https://hook.us1.make.com/your_webhook_url
```

### Where to get these values:

**OpenAI API Key:**
- Go to https://platform.openai.com/api-keys
- Sign in or create an account
- Click "Create new secret key"
- Copy the key and paste it in `.env.local` (replace `your_openai_api_key_here`)

**Outlook SMTP Settings:**
- `SMTP_USER`: Your Outlook email address (e.g., `you@outlook.com`)
- `SMTP_PASSWORD`: Your Outlook email password (or app password if you have 2FA enabled)
- `SMTP_FROM_NAME`: The name that will appear as the sender (e.g., "Sales Team")

**Make.com Webhook (Optional):**
- Only fill this in if you're using Make.com for automation
- Leave it empty if you're not using it

---

## 🚀 Step 3: Start the Development Server

Once you've created the `.env.local` file with your API keys, run:

```bash
npm run dev
```

This will start the application on http://localhost:3000

---

## 🎯 Step 4: Test the Application

1. Open your browser and go to: http://localhost:3000
2. You should see the "Sales Email Assistant" interface
3. Try filling out the form and generating an email

---

## ⚠️ Important Notes:

- **Never commit `.env.local` to git** - it contains sensitive information
- The `.gitignore` file already excludes it, so you're safe
- If you get errors about missing API keys, double-check your `.env.local` file
- The database and upload folders will be created automatically when you first use the app

---

## 🆘 Troubleshooting:

**"OPENAI_API_KEY is not configured" error:**
- Make sure `.env.local` exists in the root folder
- Make sure the file is named exactly `.env.local` (not `.env.local.txt`)
- Restart the dev server after creating/editing `.env.local`

**Email sending fails:**
- Check your Outlook SMTP credentials
- If you have 2FA enabled, you may need to create an "App Password" in your Microsoft account settings
- Make sure your Outlook account allows SMTP access

**Port 3000 already in use:**
- Another app might be using port 3000
- You can change the port by running: `npm run dev -- -p 3001`

