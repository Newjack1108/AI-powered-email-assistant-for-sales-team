import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Header from '@/components/Header';
import { useAuth } from '@/lib/useAuth';

interface Template {
  id: string;
  name: string;
  subject?: string;
  body: string;
  attachments?: string;
}

interface Attachment {
  filename: string;
  path: string;
  size: number;
  mimetype: string;
}

export default function Home() {
  const { user, loading: authLoading } = useAuth(); // Use auth hook
  const [formData, setFormData] = useState({
    recipientName: '',
    recipientEmail: '',
    leadSource: '',
    productType: '',
    urgency: '',
    isFollowUp: false,
    qualificationInfo: '',
    specialOffers: '',
    leadTimes: '',
    additionalContext: '',
    postcode: '',
    templateId: '',
    mood: 'professional',
  });

  const [templates, setTemplates] = useState<Template[]>([]);
  const [specialOffers, setSpecialOffers] = useState<{ id: string; name: string; description: string }[]>([]);
  const [productTypes, setProductTypes] = useState<{ id: string; name: string; trading_name?: string; description?: string }[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [generatedEmail, setGeneratedEmail] = useState<{ subject: string; body: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [shortening, setShortening] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadTemplates();
    loadSpecialOffers();
    loadProductTypes();
  }, []);

  const loadSpecialOffers = async () => {
    try {
      const res = await fetch('/api/special-offers');
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const data = await res.json();
      // Ensure data is always an array
      setSpecialOffers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading special offers:', error);
      setSpecialOffers([]);
    }
  };

  const loadProductTypes = async () => {
    try {
      const res = await fetch('/api/product-types');
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const data = await res.json();
      // Ensure data is always an array
      setProductTypes(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading product types:', error);
      setProductTypes([]);
    }
  };

  useEffect(() => {
    // When template is selected, load its attachments
    if (formData.templateId && templates.length > 0) {
      const selectedTemplate = templates.find(t => t.id === formData.templateId);
      if (selectedTemplate?.attachments) {
        try {
          const templateAttachments = JSON.parse(selectedTemplate.attachments);
          if (Array.isArray(templateAttachments) && templateAttachments.length > 0) {
            setAttachments(templateAttachments);
            setMessage({ type: 'success', text: `Loaded ${templateAttachments.length} attachment(s) from template` });
            // Clear message after 3 seconds
            setTimeout(() => setMessage(null), 3000);
          } else {
            setAttachments([]);
          }
        } catch (error) {
          console.error('Error parsing template attachments:', error);
          setAttachments([]);
        }
      } else {
        // Clear attachments if template has none
        setAttachments([]);
      }
    } else if (!formData.templateId) {
      // When template is cleared, clear attachments
      setAttachments([]);
    }
  }, [formData.templateId, templates]);

  const loadTemplates = async () => {
    try {
      const res = await fetch('/api/templates');
      const data = await res.json();
      // Ensure data is always an array
      if (Array.isArray(data)) {
        setTemplates(data);
      } else {
        setTemplates([]);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
      setTemplates([]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('attachment', file);

    try {
      const res = await fetch('/api/upload-attachment', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        setAttachments(prev => [...prev, data.file]);
        setMessage({ type: 'success', text: 'File uploaded successfully' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to upload file' });
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const downloadAsEML = async () => {
    if (!generatedEmail) return;

    // Get user's email for from address
    const fromEmail = user?.email_smtp_user || user?.email || 'sales@cheshiresheds.co.uk';
    const fromName = user?.email_from_name || user?.name || 'Cheshire Sheds and Garden Buildings';
    const toEmail = formData.recipientEmail;
    const toName = formData.recipientName || '';
    
    // Format date in email format
    const date = new Date().toUTCString();
    
    // Escape email body for .eml format
    const bodyText = generatedEmail.body
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\n/g, '\r\n'); // Convert to CRLF for email
    
    // Build .eml file content
    let emlContent = '';
    
    if (attachments.length > 0) {
      // Multipart message with attachments
      const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      emlContent = [
        `From: ${fromName} <${fromEmail}>`,
        `To: ${toName ? `${toName} <${toEmail}>` : toEmail}`,
        `Subject: ${generatedEmail.subject}`,
        `Date: ${date}`,
        `MIME-Version: 1.0`,
        `Content-Type: multipart/mixed; boundary="${boundary}"`,
        ``,
        `--${boundary}`,
        `Content-Type: text/plain; charset=utf-8`,
        `Content-Transfer-Encoding: 8bit`,
        ``,
        bodyText,
        ``,
      ].join('\r\n');
      
      // Add attachments
      for (const attachment of attachments) {
        try {
          // Fetch the attachment file
          const response = await fetch(attachment.path);
          const blob = await response.blob();
          const arrayBuffer = await blob.arrayBuffer();
          // Convert ArrayBuffer to base64 (compatible with TypeScript)
          const uint8Array = new Uint8Array(arrayBuffer);
          let binaryString = '';
          for (let i = 0; i < uint8Array.length; i++) {
            binaryString += String.fromCharCode(uint8Array[i]);
          }
          const base64 = btoa(binaryString);
          
          // Get content type
          const contentType = attachment.mimetype || blob.type || 'application/octet-stream';
          
          // Add attachment to .eml
          emlContent += [
            `--${boundary}`,
            `Content-Type: ${contentType}; name="${attachment.filename}"`,
            `Content-Transfer-Encoding: base64`,
            `Content-Disposition: attachment; filename="${attachment.filename}"`,
            ``,
            base64.match(/.{1,76}/g)?.join('\r\n') || base64, // Split base64 into 76-char lines
            ``,
          ].join('\r\n');
        } catch (error) {
          console.error(`Error processing attachment ${attachment.filename}:`, error);
          // Continue with other attachments
        }
      }
      
      // Close multipart boundary
      emlContent += `--${boundary}--\r\n`;
    } else {
      // Simple text message without attachments
      emlContent = [
        `From: ${fromName} <${fromEmail}>`,
        `To: ${toName ? `${toName} <${toEmail}>` : toEmail}`,
        `Subject: ${generatedEmail.subject}`,
        `Date: ${date}`,
        `MIME-Version: 1.0`,
        `Content-Type: text/plain; charset=utf-8`,
        `Content-Transfer-Encoding: 8bit`,
        ``,
        bodyText
      ].join('\r\n');
    }

    // Create blob and download
    const blob = new Blob([emlContent], { type: 'message/rfc822' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${generatedEmail.subject.replace(/[^a-z0-9]/gi, '_')}.eml`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleGenerateEmail = async () => {
    if (!formData.recipientEmail) {
      setMessage({ type: 'error', text: 'Recipient email is required' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const selectedTemplate = templates.find(t => t.id === formData.templateId);
      
      // If using a template, we can either:
      // 1. Let AI enhance it (current approach)
      // 2. Use template directly with placeholder replacement
      // For now, we'll let AI enhance it but also support direct template use
      const useTemplateDirectly = selectedTemplate && formData.templateId;
      
      // Find the selected product type to get trading_name
      const selectedProductType = productTypes.find(pt => pt.id === formData.productType);
      
      const res = await fetch('/api/generate-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          productTypeTradingName: selectedProductType?.trading_name, // Pass trading name separately
          template: selectedTemplate?.body,
          useTemplateDirectly: false, // Set to true if you want to use template as-is with just placeholder replacement
        }),
      });

      const data = await res.json();
      
      if (res.ok) {
        setGeneratedEmail(data);
        setMessage({ type: 'success', text: 'Email generated successfully!' });
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to generate email' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to generate email' });
    } finally {
      setLoading(false);
    }
  };

  const saveEmailToHistory = async (status: string = 'draft') => {
    if (!generatedEmail) return;

    try {
      await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          subject: generatedEmail.subject,
          body: generatedEmail.body,
          templateUsed: formData.templateId || null,
          attachments: attachments.length > 0 ? attachments : null,
          sendNow: status === 'sent',
          status: status, // 'sent', 'draft', 'opened_in_client', 'downloaded'
        }),
      });
    } catch (error) {
      console.error('Error saving email to history:', error);
    }
  };

  const handleSendEmail = async (sendNow: boolean = false) => {
    if (!generatedEmail) {
      setMessage({ type: 'error', text: 'Please generate an email first' });
      return;
    }

    // Check if user has email configured
    try {
      const userRes = await fetch('/api/auth/me');
      if (userRes.ok) {
        const userData = await userRes.json();
        const user = userData.user;
        
        if (!user.email_provider) {
          setMessage({ 
            type: 'error', 
            text: 'Email not configured. Please configure your email in Profile settings before sending emails.' 
          });
          return;
        }
      }
    } catch (error) {
      console.error('Error checking user email configuration:', error);
      // Continue anyway - let the API handle the error
    }

    setSending(true);
    setMessage(null);

    try {
      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          subject: generatedEmail.subject,
          body: generatedEmail.body,
          templateUsed: formData.templateId || null,
          attachments: attachments.length > 0 ? attachments : null,
          sendNow,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Check if response is ok before trying to parse JSON
      let data;
      try {
        data = await res.json();
      } catch (parseError) {
        console.error('Error parsing response:', parseError);
        setMessage({ type: 'error', text: 'Invalid response from server. Please check the console for details.' });
        setSending(false);
        return;
      }
      
      if (res.ok) {
        if (sendNow) {
          setMessage({ type: 'success', text: 'Email sent successfully!' });
          // Reset form
          setFormData({
            recipientName: '',
            recipientEmail: '',
            leadSource: '',
            productType: '',
            urgency: '',
            isFollowUp: false,
            qualificationInfo: '',
            specialOffers: '',
            leadTimes: '',
            additionalContext: '',
            postcode: '',
            templateId: '',
            mood: 'professional',
          });
          setGeneratedEmail(null);
          setAttachments([]);
        } else {
          setMessage({ type: 'success', text: 'Email saved as draft!' });
        }
      } else {
        const errorMessage = data.error || data.message || 'Failed to send email';
        console.error('Email send error:', errorMessage, data);
        setMessage({ type: 'error', text: errorMessage });
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        setMessage({ type: 'error', text: 'Request timed out. Please check your email configuration and try again.' });
      } else {
        console.error('Error sending email:', error);
        setMessage({ type: 'error', text: error.message || 'Failed to send email. Please check the console for details.' });
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <Head>
        <title>Sales Email Assistant</title>
        <meta name="description" content="AI-powered email assistant for sales team" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="manifest" href="/site.webmanifest" />
      </Head>

      <Header />

      <div className="container">
        {message && (
          <div className={`alert alert-${message.type}`}>
            {message.text}
          </div>
        )}

        <div className="card">
          <h2 style={{ marginBottom: '24px' }}>Compose Email</h2>

          <div className="form-group">
            <label htmlFor="templateId">Email Template (Optional)</label>
            <select
              id="templateId"
              name="templateId"
              value={formData.templateId}
              onChange={handleInputChange}
            >
              <option value="">No template</option>
              {templates.map(template => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
            <small style={{ color: '#666', display: 'block', marginTop: '4px' }}>
              Templates can use placeholders like {'{{customername}}'}, {'{{postcode}}'}, {'{{productType}}'}, etc.
            </small>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="recipientName">Recipient Name</label>
              <input
                type="text"
                id="recipientName"
                name="recipientName"
                value={formData.recipientName}
                onChange={handleInputChange}
                placeholder="John Doe"
              />
            </div>

            <div className="form-group">
              <label htmlFor="recipientEmail">Recipient Email *</label>
              <input
                type="email"
                id="recipientEmail"
                name="recipientEmail"
                value={formData.recipientEmail}
                onChange={handleInputChange}
                placeholder="john@example.com"
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="leadSource">Lead Source</label>
              <select
                id="leadSource"
                name="leadSource"
                value={formData.leadSource}
                onChange={handleInputChange}
              >
                <option value="">Select source</option>
                <option value="Facebook">Facebook</option>
                <option value="Website">Website</option>
                <option value="LinkedIn">LinkedIn</option>
                <option value="Referral">Referral</option>
                <option value="Trade Show">Trade Show</option>
                <option value="Cold Call">Cold Call</option>
                <option value="Email Campaign">Email Campaign</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="productType">Product Type</label>
              <select
                id="productType"
                name="productType"
                value={formData.productType}
                onChange={handleInputChange}
              >
                <option value="">Select product type</option>
                {productTypes.map(pt => (
                  <option key={pt.id} value={pt.name}>
                    {pt.name}
                  </option>
                ))}
              </select>
              {productTypes.length === 0 && (
                <small style={{ display: 'block', marginTop: '8px', color: '#666' }}>
                  No product types available. <Link href="/admin/product-types">Admin: Manage Product Types</Link>
                </small>
              )}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="urgency">Urgency Level</label>
              <select
                id="urgency"
                name="urgency"
                value={formData.urgency}
                onChange={handleInputChange}
              >
                <option value="">Select urgency</option>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <div className="checkbox-group">
              <input
                type="checkbox"
                id="isFollowUp"
                name="isFollowUp"
                checked={formData.isFollowUp}
                onChange={handleInputChange}
              />
              <label htmlFor="isFollowUp">This is a follow-up email</label>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="qualificationInfo">Information Needed to Qualify Lead</label>
            <textarea
              id="qualificationInfo"
              name="qualificationInfo"
              value={formData.qualificationInfo}
              onChange={handleInputChange}
              placeholder="e.g., Budget, timeline, decision makers, specific requirements..."
            />
          </div>

          <div className="form-group">
            <label htmlFor="specialOffers">Special Offers Available</label>
            <textarea
              id="specialOffers"
              name="specialOffers"
              value={formData.specialOffers}
              onChange={handleInputChange}
              placeholder="e.g., 10% discount, free consultation, limited time offer..."
            />
          </div>

          <div className="form-group">
            <label htmlFor="leadTimes">Lead Times</label>
            <textarea
              id="leadTimes"
              name="leadTimes"
              value={formData.leadTimes}
              onChange={handleInputChange}
              placeholder="e.g., 2-3 weeks delivery, immediate availability..."
            />
          </div>

          <div className="form-group">
            <label htmlFor="additionalContext">Additional Context</label>
            <textarea
              id="additionalContext"
              name="additionalContext"
              value={formData.additionalContext}
              onChange={handleInputChange}
              placeholder="Any additional information that would help write a better email..."
            />
          </div>

          <div className="form-group">
            <label htmlFor="mood">Email Tone/Mood</label>
            <select
              id="mood"
              name="mood"
              value={formData.mood}
              onChange={handleInputChange}
            >
              <option value="professional">Professional</option>
              <option value="friendly">Friendly</option>
              <option value="casual">Casual</option>
              <option value="urgent">Urgent</option>
              <option value="enthusiastic">Enthusiastic</option>
              <option value="empathetic">Empathetic</option>
            </select>
            <small style={{ display: 'block', marginTop: '8px', color: '#666' }}>
              Select the tone you want for this email
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="attachment">Attachments</label>
            <input
              type="file"
              id="attachment"
              onChange={handleFileUpload}
              style={{ padding: '8px' }}
            />
            {attachments.length > 0 && (
              <div className="attachment-list">
                {attachments.map((att, index) => (
                  <div key={index} className="attachment-item">
                    <span>{att.filename} ({(att.size / 1024).toFixed(2)} KB)</span>
                    <button onClick={() => removeAttachment(index)}>Remove</button>
                  </div>
                ))}
              </div>
            )}
            {formData.templateId && attachments.length > 0 && (
              <small style={{ color: '#666', display: 'block', marginTop: '8px' }}>
                {attachments.length} attachment(s) loaded from template. You can add more or remove any.
              </small>
            )}
          </div>

          <div className="actions">
            <button
              className="btn btn-primary"
              onClick={handleGenerateEmail}
              disabled={loading || !formData.recipientEmail}
            >
              {loading ? <span className="loading"></span> : null}
              Generate Email
            </button>
          </div>

          {generatedEmail && (
            <div className="email-preview">
              <h3>Generated Email Preview</h3>
              <div className="email-preview-subject">
                <strong>Subject:</strong> {generatedEmail.subject}
              </div>
              <div className="email-preview-body">{generatedEmail.body}</div>

              <div className="actions">
                <button
                  className="btn btn-primary"
                  onClick={() => handleSendEmail(true)}
                  disabled={sending}
                >
                  {sending ? <span className="loading"></span> : null}
                  Send Email Now
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => handleSendEmail(false)}
                  disabled={sending}
                >
                  Save as Draft
                </button>
                {user && !user.email_provider && (
                  <div style={{ marginTop: '12px', padding: '12px', background: '#fff3cd', border: '1px solid #ffc107', borderRadius: '6px', fontSize: '0.9em', width: '100%' }}>
                    ⚠️ <strong>Email not configured.</strong> Please configure your email in <Link href="/profile">Profile settings</Link> to send emails.
                  </div>
                )}
                <button
                  className="btn btn-outline"
                  onClick={async () => {
                    // Note: mailto links don't support attachments
                    // If attachments exist, suggest using .eml file instead
                    if (attachments.length > 0) {
                      const useEML = confirm(
                        'The "Open in Email Client" option cannot include attachments.\n\n' +
                        'Would you like to download the .eml file instead (which includes attachments)?\n\n' +
                        'Click OK to download .eml file, or Cancel to open without attachments.'
                      );
                      
                      if (useEML) {
                        await saveEmailToHistory('downloaded');
                        await downloadAsEML();
                        return;
                      }
                    }
                    
                    // Create mailto link - use %0A (LF) which works better with Outlook
                    const subject = encodeURIComponent(generatedEmail.subject);
                    
                    // Split body into lines, encode each line separately, then join with %0A
                    const bodyLines = generatedEmail.body.split(/\r?\n/);
                    const encodedBody = bodyLines
                      .map(line => encodeURIComponent(line))
                      .join('%0A'); // Use %0A (LF) which is more widely supported than %0D%0A
                    
                    const to = encodeURIComponent(formData.recipientEmail);
                    const mailtoLink = `mailto:${to}?subject=${subject}&body=${encodedBody}`;
                    
                    // Save to history before opening
                    await saveEmailToHistory('opened_in_client');
                    
                    window.location.href = mailtoLink;
                  }}
                >
                  Open in Email Client
                  {attachments.length > 0 && <span style={{ fontSize: '0.8em', display: 'block', color: '#ff9800', marginTop: '2px' }}>(No attachments)</span>}
                </button>
                <button
                  className="btn btn-outline"
                  onClick={async () => {
                    // Save to history before downloading
                    await saveEmailToHistory('downloaded');
                    // Download as .eml file (better for Outlook)
                    downloadAsEML();
                  }}
                  style={{ marginLeft: '8px' }}
                >
                  Download .eml File
                </button>
                <button
                  className="btn btn-outline"
                  onClick={() => setGeneratedEmail(null)}
                >
                  Regenerate
                </button>
                <button
                  className="btn btn-outline"
                  onClick={async () => {
                    if (!generatedEmail) return;
                    
                    setShortening(true);
                    setMessage(null);
                    
                    try {
                      const res = await fetch('/api/shorten-email', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          subject: generatedEmail.subject,
                          body: generatedEmail.body,
                        }),
                      });

                      const data = await res.json();

                      if (res.ok) {
                        setGeneratedEmail(data);
                        setMessage({ type: 'success', text: 'Email shortened successfully!' });
                      } else {
                        setMessage({ type: 'error', text: data.error || 'Failed to shorten email' });
                      }
                    } catch (error: any) {
                      console.error('Error shortening email:', error);
                      setMessage({ type: 'error', text: 'Failed to shorten email' });
                    } finally {
                      setShortening(false);
                    }
                  }}
                  disabled={shortening || !generatedEmail}
                  style={{ marginLeft: '8px' }}
                >
                  {shortening ? <span className="loading"></span> : null}
                  {shortening ? 'Shortening...' : 'Shorten Email'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

