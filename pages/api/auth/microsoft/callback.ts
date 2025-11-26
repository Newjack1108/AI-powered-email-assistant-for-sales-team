import type { NextApiRequest, NextApiResponse } from 'next';
import { getTokenFromCode, getUserEmail } from '@/lib/microsoft-oauth';
import { getUserById, updateUser } from '@/lib/db';
import { encrypt } from '@/lib/encryption';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { code, state, error } = req.query;

    // Check for OAuth errors
    if (error) {
      console.error('OAuth error:', error);
      return res.redirect(`/?oauth_error=${encodeURIComponent(error as string)}`);
    }

    if (!code || !state) {
      return res.redirect('/?oauth_error=missing_code_or_state');
    }

    // Verify state (should contain user ID)
    const cookies = req.headers.cookie || '';
    const stateCookie = cookies.split(';').find(c => c.trim().startsWith('oauth_state='));
    const storedState = stateCookie?.split('=')[1];

    if (!storedState || storedState !== state) {
      return res.redirect('/?oauth_error=invalid_state');
    }

    // Extract user ID from state
    const userId = (state as string).split(':')[0];
    if (!userId) {
      return res.redirect('/?oauth_error=invalid_user_id');
    }

    // Get user from database
    const user = await getUserById(userId);
    if (!user) {
      return res.redirect('/?oauth_error=user_not_found');
    }

    // Exchange code for tokens
    const tokens = await getTokenFromCode(code as string);

    // Get user's email from Microsoft
    const microsoftEmail = await getUserEmail(tokens.access_token);

    // Encrypt tokens before storing
    const encryptedAccessToken = encrypt(tokens.access_token);
    const encryptedRefreshToken = encrypt(tokens.refresh_token);

    // Update user with OAuth tokens
    await updateUser(userId, {
      email_provider: 'oauth',
      email_oauth_access_token: encryptedAccessToken,
      email_oauth_refresh_token: encryptedRefreshToken,
      email_oauth_expires_at: tokens.expires_at.toISOString(),
      email_smtp_user: microsoftEmail, // Store Microsoft email for reference
      email_configured_at: new Date().toISOString(),
    });

    // Clear state cookie
    res.setHeader(
      'Set-Cookie',
      'oauth_state=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0'
    );

    // Redirect to profile page with success message
    res.redirect('/profile?oauth_success=true');
  } catch (error: any) {
    console.error('OAuth callback error:', error);
    return res.redirect(`/?oauth_error=${encodeURIComponent(error.message || 'unknown_error')}`);
  }
}

