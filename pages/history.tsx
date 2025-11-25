import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { format } from 'date-fns';

interface EmailRecord {
  id: string;
  recipient_email: string;
  recipient_name?: string;
  subject: string;
  body: string;
  lead_source?: string;
  product_type?: string;
  urgency?: string;
  is_followup: number;
  status: string;
  created_at: string;
  sent_at?: string;
  sent_via?: string;
}

export default function History() {
  const [emails, setEmails] = useState<EmailRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmail, setSelectedEmail] = useState<EmailRecord | null>(null);

  useEffect(() => {
    loadEmails();
  }, []);

  const loadEmails = async () => {
    try {
      const res = await fetch('/api/emails');
      const data = await res.json();
      setEmails(data);
    } catch (error) {
      console.error('Error loading emails:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusClass = `status-badge status-${status}`;
    return <span className={statusClass}>{status.toUpperCase()}</span>;
  };

  return (
    <>
      <Head>
        <title>Email History - Sales Email Assistant</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="header">
        <div className="header-content">
          <div className="header-logo-container">
            <img 
              src="/logo.png" 
              alt="Company Logo" 
              className="header-logo"
              onError={(e) => {
                // Hide logo if image doesn't exist
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
            <h1>Sales Email Assistant</h1>
          </div>
          <nav className="nav-links">
            <Link href="/">Compose</Link>
            <Link href="/history">History</Link>
            <Link href="/templates">Templates</Link>
          </nav>
        </div>
      </div>

      <div className="container">
        <div className="card">
          <h2 style={{ marginBottom: '24px' }}>Email History</h2>

          {loading ? (
            <p>Loading...</p>
          ) : emails.length === 0 ? (
            <p>No emails found. Start composing your first email!</p>
          ) : (
            <>
              <table className="history-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Recipient</th>
                    <th>Subject</th>
                    <th>Product Type</th>
                    <th>Lead Source</th>
                    <th>Urgency</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {emails.map(email => (
                    <tr key={email.id}>
                      <td>
                        {format(new Date(email.created_at), 'MMM dd, yyyy HH:mm')}
                      </td>
                      <td>
                        {email.recipient_name || email.recipient_email}
                        <br />
                        <small style={{ color: '#666' }}>{email.recipient_email}</small>
                      </td>
                      <td>{email.subject}</td>
                      <td>{email.product_type || '-'}</td>
                      <td>{email.lead_source || '-'}</td>
                      <td>{email.urgency || '-'}</td>
                      <td>{getStatusBadge(email.status)}</td>
                      <td>
                        <button
                          className="btn btn-outline"
                          onClick={() => setSelectedEmail(email)}
                          style={{ fontSize: '12px', padding: '6px 12px' }}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {selectedEmail && (
                <div className="email-preview" style={{ marginTop: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3>Email Details</h3>
                    <button
                      className="btn btn-outline"
                      onClick={() => setSelectedEmail(null)}
                      style={{ fontSize: '12px', padding: '6px 12px' }}
                    >
                      Close
                    </button>
                  </div>
                  
                  <div style={{ marginBottom: '12px' }}>
                    <strong>To:</strong> {selectedEmail.recipient_name || ''} &lt;{selectedEmail.recipient_email}&gt;
                  </div>
                  
                  <div style={{ marginBottom: '12px' }}>
                    <strong>Subject:</strong> {selectedEmail.subject}
                  </div>

                  {selectedEmail.product_type && (
                    <div style={{ marginBottom: '12px' }}>
                      <strong>Product Type:</strong> {selectedEmail.product_type}
                    </div>
                  )}

                  {selectedEmail.lead_source && (
                    <div style={{ marginBottom: '12px' }}>
                      <strong>Lead Source:</strong> {selectedEmail.lead_source}
                    </div>
                  )}

                  {selectedEmail.urgency && (
                    <div style={{ marginBottom: '12px' }}>
                      <strong>Urgency:</strong> {selectedEmail.urgency}
                    </div>
                  )}

                  <div style={{ marginBottom: '12px' }}>
                    <strong>Follow-up:</strong> {selectedEmail.is_followup ? 'Yes' : 'No'}
                  </div>

                  <div style={{ marginBottom: '12px' }}>
                    <strong>Status:</strong> {getStatusBadge(selectedEmail.status)}
                  </div>

                  {selectedEmail.sent_at && (
                    <div style={{ marginBottom: '12px' }}>
                      <strong>Sent:</strong> {format(new Date(selectedEmail.sent_at), 'MMM dd, yyyy HH:mm')}
                      {selectedEmail.sent_via && ` via ${selectedEmail.sent_via}`}
                    </div>
                  )}

                  <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e9ecef' }}>
                    <strong>Body:</strong>
                    <div className="email-preview-body" style={{ marginTop: '8px' }}>
                      {selectedEmail.body}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

