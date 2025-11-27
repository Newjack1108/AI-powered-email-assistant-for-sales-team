import { useState, useEffect } from 'react';
import Head from 'next/head';
import Header from '@/components/Header';
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
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    loadEmails(currentPage);
  }, [currentPage]);

  const loadEmails = async (page: number) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/emails?page=${page}`);
      const data = await res.json();
      setEmails(data);
    } catch (error) {
      console.error('Error loading emails:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    // If we got 15 emails, there might be more pages
    if (emails.length === 15) {
      setCurrentPage(currentPage + 1);
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
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
      </Head>

      <Header />

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

              <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button
                  className="btn btn-outline"
                  onClick={handlePreviousPage}
                  disabled={currentPage === 1 || loading}
                  style={{ fontSize: '14px', padding: '8px 16px' }}
                >
                  Previous
                </button>
                <span style={{ fontSize: '14px', color: '#666' }}>Page {currentPage}</span>
                <button
                  className="btn btn-outline"
                  onClick={handleNextPage}
                  disabled={emails.length < 15 || loading}
                  style={{ fontSize: '14px', padding: '8px 16px' }}
                >
                  Next
                </button>
              </div>

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

