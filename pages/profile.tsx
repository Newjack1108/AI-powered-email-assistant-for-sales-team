import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useAuth } from '@/lib/useAuth';
import Header from '@/components/Header';

export default function Profile() {
  const { user, loading } = useAuth(true);
  const [formData, setFormData] = useState({
    name: '',
    signature_name: '',
    signature_title: '',
    signature_phone: '',
    signature_email: '',
    signature_company: '',
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [emailConfig, setEmailConfig] = useState({
    email_smtp_host: '',
    email_smtp_port: 587,
    email_smtp_user: '',
    email_smtp_password: '',
    email_from_name: '',
  });
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showSMTPForm, setShowSMTPForm] = useState(false);
  const [oauthStatus, setOauthStatus] = useState<any>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [savingEmailConfig, setSavingEmailConfig] = useState(false);
  const [checkingOAuth, setCheckingOAuth] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        signature_name: user.signature_name || '',
        signature_title: user.signature_title || '',
        signature_phone: user.signature_phone || '',
        signature_email: user.signature_email || '',
        signature_company: user.signature_company || '',
      });
      setEmailConfig({
        email_smtp_host: (user as any).email_smtp_host || '',
        email_smtp_port: (user as any).email_smtp_port || 587,
        email_smtp_user: (user as any).email_smtp_user || '',
        email_smtp_password: '', // Don't pre-fill password
        email_from_name: (user as any).email_from_name || '',
      });
      checkOAuthStatus();
    }
  }, [user]);

  const checkOAuthStatus = async () => {
    setCheckingOAuth(true);
    try {
      const res = await fetch('/api/auth/microsoft/status');
      if (res.ok) {
        const data = await res.json();
        setOauthStatus(data);
      }
    } catch (error) {
      console.error('Error checking OAuth status:', error);
    } finally {
      setCheckingOAuth(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleEmailConfigChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEmailConfig(prev => ({ 
      ...prev, 
      [name]: name === 'email_smtp_port' ? parseInt(value) || 587 : value 
    }));
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangingPassword(true);
    setMessage(null);

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match' });
      setChangingPassword(false);
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters long' });
      setChangingPassword(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage({ type: 'success', text: 'Password changed successfully!' });
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setShowPasswordForm(false);
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to change password' });
      }
    } catch (error: any) {
      console.error('Error changing password:', error);
      setMessage({ type: 'error', text: 'Failed to change password' });
    } finally {
      setChangingPassword(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch('/api/auth/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage({ type: 'success', text: 'Profile updated successfully!' });
        // Refresh user data
        window.location.reload();
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to update profile' });
      }
    } catch (error: any) {
      console.error('Error updating profile:', error);
      setMessage({ type: 'error', text: 'Failed to update profile' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <>
        <Head>
          <title>Profile - Sales Email Assistant</title>
        </Head>
        <Header />
        <div className="container">
          <div className="card">
            <p>Loading...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Profile - Sales Email Assistant</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Header />

      <div className="container">
        {message && (
          <div className={`alert alert-${message.type}`}>
            {message.text}
          </div>
        )}

        <div className="card">
          <h2>Your Profile</h2>
          <p style={{ color: '#666', marginBottom: '24px' }}>
            Update your profile information and email signature details. These will be used when generating emails.
          </p>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="name">Full Name *</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                placeholder="Your full name"
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                value={user?.email || ''}
                disabled
                style={{ backgroundColor: '#f5f5f5', color: '#666' }}
              />
              <small style={{ color: '#666' }}>Email cannot be changed</small>
            </div>

            <h3 style={{ marginTop: '32px', marginBottom: '16px' }}>Email Signature</h3>
            <p style={{ color: '#666', marginBottom: '24px', fontSize: '0.9em' }}>
              These details will be automatically added to the bottom of generated emails.
            </p>

            <div className="form-group">
              <label htmlFor="signature_name">Signature Name</label>
              <input
                type="text"
                id="signature_name"
                name="signature_name"
                value={formData.signature_name}
                onChange={handleInputChange}
                placeholder="Name to appear in signature"
              />
            </div>

            <div className="form-group">
              <label htmlFor="signature_title">Job Title</label>
              <input
                type="text"
                id="signature_title"
                name="signature_title"
                value={formData.signature_title}
                onChange={handleInputChange}
                placeholder="e.g., Sales Manager"
              />
            </div>

            <div className="form-group">
              <label htmlFor="signature_phone">Phone Number</label>
              <input
                type="tel"
                id="signature_phone"
                name="signature_phone"
                value={formData.signature_phone}
                onChange={handleInputChange}
                placeholder="e.g., 01606 352352"
              />
            </div>

            <div className="form-group">
              <label htmlFor="signature_email">Email Address</label>
              <input
                type="email"
                id="signature_email"
                name="signature_email"
                value={formData.signature_email}
                onChange={handleInputChange}
                placeholder="your.email@example.com"
              />
            </div>

            <div className="form-group">
              <label htmlFor="signature_company">Company Name</label>
              <input
                type="text"
                id="signature_company"
                name="signature_company"
                value={formData.signature_company}
                onChange={handleInputChange}
                placeholder="Company name for signature"
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving}
              style={{ marginTop: '20px' }}
            >
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </form>

          <div style={{ marginTop: '40px', paddingTop: '40px', borderTop: '1px solid #eee' }}>
            <h3 style={{ marginBottom: '16px' }}>Email Configuration</h3>
            <p style={{ color: '#666', marginBottom: '24px', fontSize: '0.9em' }}>
              Configure your email account to send emails. Use SMTP settings for your Outlook/Office365 account.
            </p>

            {/* SMTP Configuration - Primary Method */}
            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ marginBottom: '12px' }}>SMTP Configuration</h4>
              <p style={{ color: '#666', fontSize: '0.9em', marginBottom: '16px' }}>
                Configure your Outlook/Office365 SMTP settings. Use your email address and password (or app password if you have 2FA enabled).
              </p>
              
              {user && (user as any).email_provider === 'smtp' && (
                <div style={{ marginBottom: '16px', padding: '12px', background: '#d4edda', border: '1px solid #28a745', borderRadius: '6px' }}>
                  <p style={{ color: '#155724', margin: 0 }}>
                    ✓ Email configured via SMTP
                    {(user as any).email_smtp_user && (
                      <span style={{ display: 'block', marginTop: '4px', fontSize: '0.9em' }}>
                        Using: {(user as any).email_smtp_user}
                      </span>
                    )}
                  </p>
                </div>
              )}

              <button
                className="btn btn-primary"
                onClick={() => setShowSMTPForm(!showSMTPForm)}
                style={{ marginBottom: '20px' }}
              >
                {showSMTPForm ? 'Hide SMTP Settings' : (user && (user as any).email_provider === 'smtp' ? 'Update SMTP Settings' : 'Configure SMTP')}
              </button>

              {showSMTPForm && (
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  setSavingEmailConfig(true);
                  setMessage(null);

                  try {
                    const res = await fetch('/api/auth/update-profile', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        ...formData,
                        email_provider: 'smtp',
                        ...emailConfig,
                      }),
                    });

                    const data = await res.json();

                    if (res.ok) {
                      setMessage({ type: 'success', text: 'SMTP configuration saved!' });
                      setShowSMTPForm(false);
                      window.location.reload();
                    } else {
                      setMessage({ type: 'error', text: data.error || 'Failed to save SMTP configuration' });
                    }
                  } catch (error: any) {
                    console.error('Error saving SMTP config:', error);
                    setMessage({ type: 'error', text: 'Failed to save SMTP configuration' });
                  } finally {
                    setSavingEmailConfig(false);
                  }
                }} style={{ padding: '20px', background: '#f8f9fa', borderRadius: '6px' }}>
                    <div className="form-group">
                      <label htmlFor="email_smtp_host">SMTP Host *</label>
                      <input
                        type="text"
                        id="email_smtp_host"
                        name="email_smtp_host"
                        value={emailConfig.email_smtp_host}
                        onChange={handleEmailConfigChange}
                        required
                        placeholder="smtp.office365.com"
                      />
                      <small style={{ color: '#666', display: 'block', marginTop: '4px' }}>
                        For Outlook/Office365: smtp.office365.com
                      </small>
                    </div>
                    <div className="form-group">
                      <label htmlFor="email_smtp_port">SMTP Port *</label>
                      <input
                        type="number"
                        id="email_smtp_port"
                        name="email_smtp_port"
                        value={emailConfig.email_smtp_port}
                        onChange={handleEmailConfigChange}
                        required
                        placeholder="587"
                      />
                      <small style={{ color: '#666', display: 'block', marginTop: '4px' }}>
                        For Outlook/Office365: 587 (TLS) or 465 (SSL)
                      </small>
                    </div>
                    <div className="form-group">
                      <label htmlFor="email_smtp_user">SMTP Username (Your Email Address) *</label>
                      <input
                        type="email"
                        id="email_smtp_user"
                        name="email_smtp_user"
                        value={emailConfig.email_smtp_user}
                        onChange={handleEmailConfigChange}
                        required
                        placeholder="your.email@outlook.com"
                      />
                      <small style={{ color: '#666', display: 'block', marginTop: '4px' }}>
                        Your full Outlook/Office365 email address
                      </small>
                    </div>
                    <div className="form-group">
                      <label htmlFor="email_smtp_password">SMTP Password *</label>
                      <input
                        type="password"
                        id="email_smtp_password"
                        name="email_smtp_password"
                        value={emailConfig.email_smtp_password}
                        onChange={handleEmailConfigChange}
                        required={!emailConfig.email_smtp_password}
                        placeholder={emailConfig.email_smtp_password ? 'Leave blank to keep current' : 'Enter password'}
                      />
                      <small style={{ color: '#666', display: 'block', marginTop: '4px' }}>
                        Use your email password, or create an app password if you have 2FA enabled. 
                        <br />
                        <a href="https://support.microsoft.com/en-us/account-billing/using-app-passwords-with-apps-that-don-t-support-two-step-verification-5896ed9b-4263-e681-128a-a6f2979a7944" target="_blank" rel="noopener noreferrer" style={{ color: '#0066cc' }}>
                          Learn how to create an app password
                        </a>
                      </small>
                    </div>
                  <div className="form-group">
                    <label htmlFor="email_from_name">From Name</label>
                    <input
                      type="text"
                      id="email_from_name"
                      name="email_from_name"
                      value={emailConfig.email_from_name}
                      onChange={handleEmailConfigChange}
                      placeholder="Your Name"
                    />
                  </div>
                  <button type="submit" className="btn btn-primary" disabled={savingEmailConfig}>
                    {savingEmailConfig ? 'Saving...' : 'Save SMTP Configuration'}
                  </button>
                  </form>
                )}
            </div>

            {/* OAuth Status - Optional/Advanced */}
            {process.env.NEXT_PUBLIC_ENABLE_OAUTH === 'true' && (
              <div style={{ marginTop: '32px', marginBottom: '24px', padding: '16px', background: '#f8f9fa', borderRadius: '6px', border: '1px solid #dee2e6' }}>
                <h4 style={{ marginTop: 0, marginBottom: '8px' }}>Microsoft Account (OAuth) - Advanced</h4>
                <p style={{ fontSize: '0.85em', color: '#666', marginBottom: '12px' }}>
                  <strong>Note:</strong> OAuth requires Azure AD setup (paid service). SMTP is free and recommended.
                </p>
                {checkingOAuth ? (
                  <p>Checking connection status...</p>
                ) : oauthStatus?.connected ? (
                  <div>
                    <p style={{ color: '#28a745', marginBottom: '8px' }}>
                      ✓ Connected to Microsoft Account
                    </p>
                    {oauthStatus.email && (
                      <p style={{ fontSize: '0.9em', color: '#666', marginBottom: '8px' }}>
                        Email: {oauthStatus.email}
                      </p>
                    )}
                    <button
                      className="btn btn-danger btn-small"
                      onClick={async () => {
                        if (!confirm('Are you sure you want to disconnect your Microsoft account?')) return;
                        try {
                          const res = await fetch('/api/auth/microsoft/disconnect', { method: 'POST' });
                          if (res.ok) {
                            setMessage({ type: 'success', text: 'Microsoft account disconnected' });
                            checkOAuthStatus();
                            window.location.reload();
                          } else {
                            setMessage({ type: 'error', text: 'Failed to disconnect' });
                          }
                        } catch (error) {
                          setMessage({ type: 'error', text: 'Failed to disconnect' });
                        }
                      }}
                    >
                      Disconnect Microsoft Account
                    </button>
                  </div>
                ) : (
                  <div>
                    <p style={{ color: '#dc3545', marginBottom: '12px' }}>
                      Not connected to Microsoft Account
                    </p>
                    <button
                      className="btn btn-secondary btn-small"
                      onClick={() => {
                        window.location.href = '/api/auth/microsoft/authorize';
                      }}
                    >
                      Connect Microsoft Account (Requires Azure AD)
                    </button>
                  </div>
                )}
              </div>
            )}

            <h3 style={{ marginTop: '40px', marginBottom: '16px' }}>Change Password</h3>
            
            {!showPasswordForm ? (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowPasswordForm(true)}
              >
                Change Password
              </button>
            ) : (
              <form onSubmit={handlePasswordSubmit} style={{ maxWidth: '500px' }}>
                <div className="form-group">
                  <label htmlFor="currentPassword">Current Password</label>
                  <input
                    type="password"
                    id="currentPassword"
                    name="currentPassword"
                    value={passwordData.currentPassword}
                    onChange={handlePasswordChange}
                    required
                    placeholder="Enter your current password"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="newPassword">New Password</label>
                  <input
                    type="password"
                    id="newPassword"
                    name="newPassword"
                    value={passwordData.newPassword}
                    onChange={handlePasswordChange}
                    required
                    minLength={6}
                    placeholder="Enter new password (min 6 characters)"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="confirmPassword">Confirm New Password</label>
                  <input
                    type="password"
                    id="confirmPassword"
                    name="confirmPassword"
                    value={passwordData.confirmPassword}
                    onChange={handlePasswordChange}
                    required
                    minLength={6}
                    placeholder="Confirm new password"
                  />
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={changingPassword}
                  >
                    {changingPassword ? 'Changing...' : 'Change Password'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setShowPasswordForm(false);
                      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                      setMessage(null);
                    }}
                    disabled={changingPassword}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

