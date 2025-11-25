import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';

interface Attachment {
  filename: string;
  path: string;
  size: number;
  mimetype: string;
}

interface Template {
  id: string;
  name: string;
  subject?: string;
  body: string;
  attachments?: string;
  created_at: string;
  updated_at: string;
}

export default function Templates() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    body: '',
  });
  const [templateAttachments, setTemplateAttachments] = useState<Attachment[]>([]);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const res = await fetch('/api/templates');
      const data = await res.json();
      setTemplates(data);
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const uploadFormData = new FormData();
    uploadFormData.append('attachment', file);

    try {
      const res = await fetch('/api/upload-attachment', {
        method: 'POST',
        body: uploadFormData,
      });

      const data = await res.json();
      if (data.success) {
        setTemplateAttachments(prev => [...prev, data.file]);
      }
    } catch (error) {
      console.error('Error uploading file:', error);
    }
  };

  const removeAttachment = (index: number) => {
    setTemplateAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const attachmentsJson = templateAttachments.length > 0 
        ? JSON.stringify(templateAttachments) 
        : null;

      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          id: editingTemplate?.id,
          attachments: attachmentsJson,
        }),
      });

      if (res.ok) {
        await loadTemplates();
        setFormData({ name: '', subject: '', body: '' });
        setTemplateAttachments([]);
        setShowForm(false);
        setEditingTemplate(null);
      }
    } catch (error) {
      console.error('Error saving template:', error);
    }
  };

  const handleEdit = (template: Template) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      subject: template.subject || '',
      body: template.body,
    });
    
    // Load template attachments if they exist
    if (template.attachments) {
      try {
        const parsedAttachments = JSON.parse(template.attachments);
        setTemplateAttachments(Array.isArray(parsedAttachments) ? parsedAttachments : []);
      } catch (error) {
        console.error('Error parsing template attachments:', error);
        setTemplateAttachments([]);
      }
    } else {
      setTemplateAttachments([]);
    }
    
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      const res = await fetch(`/api/templates?id=${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        await loadTemplates();
      }
    } catch (error) {
      console.error('Error deleting template:', error);
    }
  };

  return (
    <>
      <Head>
        <title>Email Templates - Sales Email Assistant</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h2>Email Templates</h2>
            <button
              className="btn btn-primary"
              onClick={() => {
                setShowForm(!showForm);
                setEditingTemplate(null);
                setFormData({ name: '', subject: '', body: '' });
                setTemplateAttachments([]);
              }}
            >
              {showForm ? 'Cancel' : '+ New Template'}
            </button>
          </div>

          {showForm && (
            <form onSubmit={handleSubmit} style={{ marginBottom: '24px', padding: '20px', background: '#f8f9fa', borderRadius: '6px' }}>
              <div className="form-group">
                <label htmlFor="name">Template Name *</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  placeholder="e.g., Follow-up Template"
                />
              </div>

              <div className="form-group">
                <label htmlFor="subject">Subject (Optional)</label>
                <input
                  type="text"
                  id="subject"
                  name="subject"
                  value={formData.subject}
                  onChange={handleInputChange}
                  placeholder="Email subject line"
                />
              </div>

              <div className="form-group">
                <label htmlFor="body">Template Body *</label>
                <textarea
                  id="body"
                  name="body"
                  value={formData.body}
                  onChange={handleInputChange}
                  required
                  placeholder="Email template body. Use placeholders like {{recipientName}}, {{leadSource}}, etc."
                  style={{ minHeight: '200px' }}
                />
              </div>

              <div className="form-group">
                <label htmlFor="templateAttachment">Template Attachments (Optional)</label>
                <input
                  type="file"
                  id="templateAttachment"
                  onChange={handleFileUpload}
                  style={{ padding: '8px' }}
                />
                {templateAttachments.length > 0 && (
                  <div className="attachment-list" style={{ marginTop: '12px' }}>
                    {templateAttachments.map((att, index) => (
                      <div key={index} className="attachment-item">
                        <span>{att.filename} ({(att.size / 1024).toFixed(2)} KB)</span>
                        <button onClick={() => removeAttachment(index)}>Remove</button>
                      </div>
                    ))}
                  </div>
                )}
                <small style={{ color: '#666', display: 'block', marginTop: '8px' }}>
                  Attachments saved with this template will be automatically included when the template is used.
                </small>
              </div>

              <button type="submit" className="btn btn-primary">
                {editingTemplate ? 'Update Template' : 'Save Template'}
              </button>
            </form>
          )}

          {loading ? (
            <p>Loading templates...</p>
          ) : templates.length === 0 ? (
            <p>No templates yet. Create your first template!</p>
          ) : (
            <div>
              {templates.map(template => (
                <div key={template.id} className="card" style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                    <div>
                      <h3 style={{ marginBottom: '8px' }}>{template.name}</h3>
                      {template.subject && (
                        <p style={{ color: '#666', marginBottom: '8px' }}>
                          <strong>Subject:</strong> {template.subject}
                        </p>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        className="btn btn-outline"
                        onClick={() => handleEdit(template)}
                        style={{ fontSize: '12px', padding: '6px 12px' }}
                      >
                        Edit
                      </button>
                      <button
                        className="btn btn-secondary"
                        onClick={() => handleDelete(template.id)}
                        style={{ fontSize: '12px', padding: '6px 12px' }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  <div style={{ background: '#f8f9fa', padding: '12px', borderRadius: '4px', whiteSpace: 'pre-wrap', fontSize: '14px' }}>
                    {template.body}
                  </div>
                  {template.attachments && (() => {
                    try {
                      const parsedAttachments = JSON.parse(template.attachments);
                      if (Array.isArray(parsedAttachments) && parsedAttachments.length > 0) {
                        return (
                          <div style={{ marginTop: '12px', padding: '8px', background: '#e9ecef', borderRadius: '4px' }}>
                            <strong>Attachments:</strong>
                            <ul style={{ marginTop: '8px', marginLeft: '20px' }}>
                              {parsedAttachments.map((att: Attachment, index: number) => (
                                <li key={index}>{att.filename}</li>
                              ))}
                            </ul>
                          </div>
                        );
                      }
                    } catch (error) {
                      return null;
                    }
                    return null;
                  })()}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

