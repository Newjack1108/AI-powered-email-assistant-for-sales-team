# Sales Email Assistant

A professional web application for sales teams to generate and send AI-powered emails with ease.

## Features

- **AI-Powered Email Generation**: Uses OpenAI GPT-4 to generate professional, personalized emails
- **Smart Form Interface**: Simple dropdown-based form to capture all necessary information
- **Email Templates**: Save and reuse email templates
- **Attachment Support**: Upload and attach files to emails
- **Email History**: Complete log of all sent and draft emails
- **Outlook Integration**: Configured for Outlook/Office365 SMTP
- **Make.com Integration**: Webhook support for Make.com automation
- **Professional UI**: Modern, clean interface for easy use

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```env
# OpenAI API Key (required for AI email generation)
OPENAI_API_KEY=your_openai_api_key_here

# SMTP Configuration for Outlook/Office365
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_USER=your_email@outlook.com
SMTP_PASSWORD=your_email_password
SMTP_FROM_NAME=Sales Team

# Make.com Webhook URL (optional)
MAKE_WEBHOOK_URL=https://hook.us1.make.com/your_webhook_url
```

### 3. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

### Composing Emails

1. Fill in the recipient information
2. Select lead source, urgency, and other relevant details
3. Optionally select an email template
4. Upload attachments if needed
5. Click "Generate Email" to create a professional email using AI
6. Review the generated email and either:
   - Send it immediately
   - Save as draft for later

### Email Templates

- Create reusable email templates from the Templates page
- Templates can include placeholders that will be filled in by the AI
- Use templates as a base structure for consistent email formatting

### Email History

- View all sent and draft emails
- Filter and search through email history
- View full email details including metadata

## Integration with Make.com

The application automatically sends webhook notifications to Make.com when emails are sent. Configure your Make.com webhook URL in the environment variables to enable this feature.

## Database

The application uses SQLite for storing emails and templates. The database file is automatically created in the `data/` directory on first run.

## Production Deployment

For production deployment:

1. Set up proper environment variables
2. Use a production database (PostgreSQL, MySQL, etc.) instead of SQLite
3. Configure proper file storage for attachments (AWS S3, etc.)
4. Set up proper email service (SendGrid, AWS SES, etc.)
5. Build the application: `npm run build`
6. Start the production server: `npm start`

## Technologies Used

- Next.js 14
- React 18
- TypeScript
- OpenAI API
- Nodemailer
- SQLite
- Multer (file uploads)

## License

MIT

