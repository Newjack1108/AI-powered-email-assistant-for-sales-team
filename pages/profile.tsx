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
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

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
    }
  }, [user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
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
        </div>
      </div>
    </>
  );
}

