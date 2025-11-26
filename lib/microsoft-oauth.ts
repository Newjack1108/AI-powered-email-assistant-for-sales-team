import { Client } from '@microsoft/microsoft-graph-client';
import 'isomorphic-fetch';

const CLIENT_ID = process.env.MICROSOFT_CLIENT_ID || '';
const CLIENT_SECRET = process.env.MICROSOFT_CLIENT_SECRET || '';
const REDIRECT_URI = process.env.MICROSOFT_REDIRECT_URI || '';
const TENANT_ID = process.env.MICROSOFT_TENANT_ID || 'common'; // 'common' for multi-tenant

const AUTHORITY = `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0`;
const TOKEN_ENDPOINT = `${AUTHORITY}/token`;
const AUTHORIZE_ENDPOINT = `${AUTHORITY}/authorize`;

/**
 * Generate Microsoft OAuth authorization URL
 */
export function getAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
    response_mode: 'query',
    scope: 'https://graph.microsoft.com/Mail.Send https://graph.microsoft.com/User.Read offline_access',
    state: state,
  });

  return `${AUTHORIZE_ENDPOINT}?${params.toString()}`;
}

/**
 * Exchange authorization code for access token
 */
export async function getTokenFromCode(code: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_at: Date;
}> {
  if (!CLIENT_ID || !CLIENT_SECRET || !REDIRECT_URI) {
    throw new Error('Microsoft OAuth credentials not configured');
  }

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    code: code,
    redirect_uri: REDIRECT_URI,
    grant_type: 'authorization_code',
    scope: 'https://graph.microsoft.com/Mail.Send https://graph.microsoft.com/User.Read offline_access',
  });

  const response = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Token exchange error:', error);
    throw new Error(`Failed to exchange code for token: ${response.statusText}`);
  }

  const data = await response.json();
  const expiresAt = new Date(Date.now() + (data.expires_in * 1000));

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: expiresAt,
    expires_in: data.expires_in,
  };
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(refreshToken: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_at: Date;
}> {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error('Microsoft OAuth credentials not configured');
  }

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
    scope: 'https://graph.microsoft.com/Mail.Send https://graph.microsoft.com/User.Read offline_access',
  });

  const response = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Token refresh error:', error);
    throw new Error(`Failed to refresh token: ${response.statusText}`);
  }

  const data = await response.json();
  const expiresAt = new Date(Date.now() + (data.expires_in * 1000));

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token || refreshToken, // Use new refresh token if provided, otherwise keep old one
    expires_at: expiresAt,
    expires_in: data.expires_in,
  };
}

/**
 * Get user's email address from Microsoft Graph
 */
export async function getUserEmail(accessToken: string): Promise<string> {
  const client = Client.init({
    authProvider: (done) => {
      done(null, accessToken);
    },
  });

  try {
    const user = await client.api('/me').get();
    return user.mail || user.userPrincipalName;
  } catch (error: any) {
    console.error('Error getting user email:', error);
    throw new Error('Failed to get user email from Microsoft Graph');
  }
}

/**
 * Send email using Microsoft Graph API
 */
export async function sendEmailViaGraph(
  accessToken: string,
  to: string,
  subject: string,
  body: string,
  fromEmail?: string,
  fromName?: string,
  attachments?: Array<{ filename: string; path: string }>
): Promise<void> {
  const client = Client.init({
    authProvider: (done) => {
      done(null, accessToken);
    },
  });

  // Convert plain text to HTML if needed
  const htmlBody = body.includes('<') 
    ? body 
    : body.replace(/\n/g, '<br>');

  const message = {
    message: {
      subject: subject,
      body: {
        contentType: 'HTML',
        content: htmlBody,
      },
      toRecipients: [
        {
          emailAddress: {
            address: to,
          },
        },
      ],
    },
    saveToSentItems: true,
  };

  // Add from address if specified
  if (fromEmail) {
    (message.message as any).from = {
      emailAddress: {
        address: fromEmail,
        name: fromName || undefined,
      },
    };
  }

  // Handle attachments if provided
  if (attachments && attachments.length > 0) {
    const fs = require('fs');
    const path = require('path');
    
    (message.message as any).attachments = attachments.map(att => {
      const filePath = att.path.startsWith('/')
        ? path.join(process.cwd(), 'public', att.path)
        : att.path;
      
      const fileContent = fs.readFileSync(filePath);
      const base64Content = fileContent.toString('base64');
      
      return {
        '@odata.type': '#microsoft.graph.fileAttachment',
        name: att.filename,
        contentType: 'application/octet-stream',
        contentBytes: base64Content,
      };
    });
  }

  try {
    await client.api('/me/sendMail').post(message);
  } catch (error: any) {
    console.error('Error sending email via Graph API:', error);
    throw new Error(`Failed to send email: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Check if access token is expired or will expire soon (within 5 minutes)
 */
export function isTokenExpired(expiresAt: string | null | undefined): boolean {
  if (!expiresAt) return true;
  
  const expiryDate = new Date(expiresAt);
  const now = new Date();
  const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);
  
  return expiryDate <= fiveMinutesFromNow;
}

