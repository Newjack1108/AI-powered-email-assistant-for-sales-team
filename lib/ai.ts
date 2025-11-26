import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

// Assistant ID - will be created on first use if not set
// We'll check the environment variable fresh each time to ensure we use the latest value
function getAssistantIdFromEnv(): string | null {
  return process.env.OPENAI_ASSISTANT_ID || null;
}

export interface EmailFormData {
  recipientName?: string;
  recipientEmail: string;
  leadSource?: string;
  productType?: string;
  productTypeTradingName?: string;
  urgency?: string;
  isFollowUp?: boolean;
  qualificationInfo?: string;
  specialOffers?: string;
  leadTimes?: string;
  additionalContext?: string;
  template?: string;
  useTemplateDirectly?: boolean;
  postcode?: string;
  mood?: string;
  userSignature?: {
    name?: string;
    title?: string;
    phone?: string;
    email?: string;
    company?: string;
  };
}

// Create or get the assistant
async function getOrCreateAssistant(): Promise<string> {
  // Always check the environment variable fresh
  let assistantId = getAssistantIdFromEnv();
  
  if (assistantId) {
    try {
      // Verify the assistant exists and retrieve its details
      const assistant = await openai.beta.assistants.retrieve(assistantId);
      console.log(`✅ Using existing assistant ID: ${assistantId}`);
      console.log(`   Assistant name: ${assistant.name}`);
      console.log(`   Assistant model: ${assistant.model}`);
      return assistantId;
    } catch (error: any) {
      console.warn(`⚠️  Assistant ID ${assistantId} not found or invalid:`, error.message);
      console.log('Creating new assistant...');
      assistantId = null;
    }
  }

  // Create a new assistant
  console.log('Creating new assistant...');
  const assistant = await openai.beta.assistants.create({
    name: 'Sales Email Assistant',
    instructions: buildAssistantInstructions(),
    model: process.env.OPENAI_MODEL || 'gpt-4o',
    temperature: 0.7,
  });

  assistantId = assistant.id;
  console.log(`✅ Created new assistant with ID: ${assistantId}`);
  console.log(`📋 IMPORTANT: Add this to your Railway environment variables:`);
  console.log(`   OPENAI_ASSISTANT_ID=${assistantId}`);
  
  return assistantId;
}

function buildAssistantInstructions(): string {
  const companyName = 'Cheshire Sheds and garden buildings ltd (CSGB Group) T/A Cheshire Stables, Cheshire Sheds and Beaver Log Cabins';
  
  return `You are a professional sales email assistant for ${companyName}.

Your role is to write clear, professional, and engaging sales emails that are personalized and effective.

Key Guidelines:
- Always maintain an appropriate tone based on the specified mood/tone
- Personalize emails based on the customer's information
- Address the specific context and requirements provided
- Include a clear call-to-action
- Be concise but comprehensive
- Naturally incorporate the company name: ${companyName}
- Focus on the customer's specific product interest when provided
- Reference lead source when relevant
- Handle follow-up emails appropriately by referencing previous conversations
- Use templates as a base structure when provided, but enhance them naturally

Product Types:
- Stables Shelters
- Sheds
- Log Cabins
- Garden Offices
- Barns

Tone/Mood Guidelines:
- Professional: Formal, business-like, polished, respectful
- Friendly: Warm, approachable, conversational, personable
- Casual: Relaxed, informal, easy-going, laid-back
- Urgent: Time-sensitive, action-oriented, compelling, immediate
- Enthusiastic: Energetic, positive, excited, optimistic
- Empathetic: Understanding, supportive, caring, compassionate

When writing emails:
1. Always start with a personalized greeting using the customer's name if provided
2. Reference how they found us (lead source) when relevant
3. Highlight relevant product features and benefits based on their interest
4. Address any urgency or time-sensitive offers
5. Include qualification questions if needed
6. Mention special offers and lead times when provided
7. End with a clear call-to-action
8. Match the specified mood/tone throughout the entire email

CRITICAL - SIGNATURE RULES:
- DO NOT include any signature, name, or contact information in the email body
- DO NOT include phrases like "[Your Name]", "Warm regards, [Name]", or any placeholder names
- DO NOT include company names, addresses, phone numbers, or email addresses at the end
- DO NOT include company contact details like "Ibex House, Nat Lane, Winsford" or "Tel: 01606 352352" or "sales@cheshiresheds.co.uk"
- DO NOT include "Cheshire Stables" or any company name after the closing
- End the email with ONLY a professional closing like "Best regards," or "Kind regards," followed by NOTHING else
- The signature with all contact information will be added automatically by the system, so you must NOT include any contact details

Format your response as:
Subject: [email subject]

[email body]

The email should match the specified mood/tone, be engaging, and tailored to the specific customer's needs and situation. Remember: NO signature or contact details in the body - end with just a closing like "Best regards,".`;
}

export async function generateEmail(formData: EmailFormData): Promise<{ subject: string; body: string }> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  try {
    // Get or create assistant
    const assistantId = await getOrCreateAssistant();
    
    if (!assistantId) {
      throw new Error('Failed to get or create assistant');
    }

    console.log(`🚀 Generating email using assistant ID: ${assistantId}`);

    // Create a thread
    const thread = await openai.beta.threads.create();

    // Build the user prompt
    const prompt = buildPrompt(formData);

    // Add the user message to the thread
    await openai.beta.threads.messages.create(thread.id, {
      role: 'user',
      content: prompt,
    });

    // Run the assistant - using the assistant ID
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: assistantId,
    });
    
    console.log(`📧 Assistant run started with ID: ${run.id}`);

    // Wait for the run to complete
    let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    
    // Poll until the run is complete (with timeout)
    const maxWaitTime = 60000; // 60 seconds
    const startTime = Date.now();
    
    while (runStatus.status === 'queued' || runStatus.status === 'in_progress') {
      if (Date.now() - startTime > maxWaitTime) {
        throw new Error('Assistant run timed out');
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
      runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    }

    if (runStatus.status === 'failed') {
      throw new Error(`Assistant run failed: ${runStatus.last_error?.message || 'Unknown error'}`);
    }

    if (runStatus.status !== 'completed') {
      throw new Error(`Assistant run ended with status: ${runStatus.status}`);
    }

    // Get the messages from the thread
    const messages = await openai.beta.threads.messages.list(thread.id);
    const assistantMessage = messages.data.find(msg => msg.role === 'assistant');
    
    if (!assistantMessage || !assistantMessage.content[0] || assistantMessage.content[0].type !== 'text') {
      throw new Error('No response from assistant');
    }

    const response = assistantMessage.content[0].text.value;

    // Parse subject and body from response
    const subjectMatch = response.match(/Subject:\s*(.+?)(?:\n|$)/i);
    const subject = subjectMatch ? subjectMatch[1].trim() : 'Follow-up from our conversation';
    
    // Extract body (everything after Subject line or the entire response)
    let body = response;
    if (subjectMatch) {
      body = response.substring(response.indexOf('\n') + 1).trim();
    }
    
    // Remove any remaining "Subject:" or "Body:" labels
    body = body.replace(/^(Subject|Body):\s*/gmi, '').trim();
    
    // Remove subject lines that appear anywhere in the body (sometimes AI includes them)
    body = body.replace(/Subject:\s*[^\n]+\n/gi, '');
    body = body.replace(/\nSubject:\s*[^\n]+/gi, '');
    body = body.replace(/Subject:\s*[^\n]+$/gi, '');

    // Remove any signature-like text that the AI might have generated
    // Look for patterns like "[Your Name]", "Warm regards, [Name]", company contact info, etc.
    body = body.replace(/\n\s*\[Your Name\].*$/gmi, '');
    body = body.replace(/\n\s*\[Name\].*$/gmi, '');
    body = body.replace(/\n\s*Cheshire Stables.*CSGB Group.*$/gmi, '');
    body = body.replace(/\n\s*Cheshire Sheds.*$/gmi, ''); // Remove "Cheshire Sheds" at end
    body = body.replace(/\n\s*---.*$/gmi, ''); // Remove separator lines
    
    // Remove company names after closings (e.g., "Warm regards, Cheshire Sheds" or "Warm regards,\nCheshire Sheds")
    body = body.replace(/(Warm regards|Best regards|Kind regards|Regards),?\s*\n?\s*Cheshire (Stables|Sheds|Sheds and Garden Buildings).*$/gmi, '$1,');
    body = body.replace(/(Warm regards|Best regards|Kind regards|Regards),?\s*,\s*Cheshire (Stables|Sheds|Sheds and Garden Buildings).*$/gmi, '$1,');
    
    // Remove company contact information patterns (address, phone, email at the end)
    // Multi-line pattern: Company name, address lines, Tel/Phone, email
    // This catches patterns like:
    // Cheshire Stables
    // Ibex House, Nat Lane, Winsford, Cheshire, CW7 3BS
    // Tel: 01606 352352
    // sales@cheshiresheds.co.uk
    body = body.replace(/\n\s*Cheshire Stables\s*\n(?:\s*[^\n]+\n)*\s*(?:Tel|Phone):\s*\d+.*?\n\s*.*?@.*$/gmi, '');
    body = body.replace(/\n\s*[A-Z][a-z]+\s+House[^\n]*\n(?:\s*[^\n]+\n)*\s*(?:Tel|Phone):\s*\d+.*?\n\s*.*?@.*$/gmi, ''); // Address pattern
    body = body.replace(/\n\s*Ibex House[^\n]*\n(?:\s*[^\n]+\n)*\s*(?:Tel|Phone):\s*\d+.*?\n\s*.*?@.*$/gmi, ''); // Specific address
    body = body.replace(/\n\s*Nat Lane[^\n]*\n(?:\s*[^\n]+\n)*\s*(?:Tel|Phone):\s*\d+.*?\n\s*.*?@.*$/gmi, ''); // Address continuation
    body = body.replace(/\n\s*Winsford[^\n]*\n(?:\s*[^\n]+\n)*\s*(?:Tel|Phone):\s*\d+.*?\n\s*.*?@.*$/gmi, ''); // City pattern
    body = body.replace(/\n\s*Cheshire[^\n]*\n(?:\s*[^\n]+\n)*\s*(?:Tel|Phone):\s*\d+.*?\n\s*.*?@.*$/gmi, ''); // County pattern
    body = body.replace(/\n\s*CW7\s+\d+[A-Z]{2}[^\n]*\n(?:\s*[^\n]+\n)*\s*(?:Tel|Phone):\s*\d+.*?\n\s*.*?@.*$/gmi, ''); // Postcode pattern
    
    // Remove any remaining company contact info after "Warm regards," or similar (single line patterns)
    body = body.replace(/(Warm regards|Best regards|Kind regards|Regards),?\s*\n\s*Cheshire (Stables|Sheds|Sheds and Garden Buildings).*$/gmi, '$1,');
    body = body.replace(/(Warm regards|Best regards|Kind regards|Regards),?\s*\n\s*[A-Z][a-z]+\s+House.*$/gmi, '$1,');
    body = body.replace(/(Warm regards|Best regards|Kind regards|Regards),?\s*\n\s*.*?(?:Tel|Phone):\s*\d+.*$/gmi, '$1,');
    body = body.replace(/(Warm regards|Best regards|Kind regards|Regards),?\s*\n\s*.*?@.*$/gmi, '$1,');
    
    // Remove company names that appear directly after closings (e.g., "Warm regards, Cheshire Sheds")
    body = body.replace(/(Warm regards|Best regards|Kind regards|Regards),?\s*,\s*Cheshire (Stables|Sheds|Sheds and Garden Buildings).*$/gmi, '$1,');
    
    // Remove multi-line company contact blocks that appear after a closing
    // Pattern: Closing, then company name, then address/contact info
    body = body.replace(/(Warm regards|Best regards|Kind regards|Regards),?\s*\n\s*Cheshire (Stables|Sheds|Sheds and Garden Buildings)\s*\n(?:\s*[^\n]+\n)*\s*(?:Tel|Phone|Ibex|Nat Lane|Winsford|CW7|sales@).*$/gmi, '$1,');
    
    body = body.trim();

    // Ensure the email ends with a proper closing (if it doesn't already)
    const hasClosing = /(Best regards|Kind regards|Warm regards|Regards|Sincerely|Thank you|Thanks),?\s*$/i.test(body);
    if (!hasClosing && body.length > 0) {
      // Add a professional closing if missing
      body += '\n\nBest regards,';
    }

    // Append user signature if provided (always at the very end)
    if (formData.userSignature) {
      const signature = buildSignature(formData.userSignature);
      if (signature) {
        // Add signature with proper spacing
        body += '\n\n' + signature;
      }
    }

    return { subject, body };
  } catch (error: any) {
    console.error('Error generating email with assistant:', error);
    throw error;
  }
}

function buildPrompt(formData: EmailFormData): string {
  const companyName = 'Cheshire Sheds and garden buildings ltd (CSGB Group) T/A Cheshire Stables, Cheshire Sheds and Beaver Log Cabins';
  
  let prompt = `Please write a professional sales email with the following details:\n\n`;

  if (formData.recipientName) {
    prompt += `Recipient Name: ${formData.recipientName}\n`;
  }
  prompt += `Recipient Email: ${formData.recipientEmail}\n\n`;

  if (formData.leadSource) {
    prompt += `Lead Source: ${formData.leadSource}\n`;
  }

  if (formData.productType) {
    prompt += `Product Type Customer is Interested In: ${formData.productType}\n`;
  }

  if (formData.urgency) {
    prompt += `Urgency Level: ${formData.urgency}\n`;
  }

  if (formData.isFollowUp) {
    prompt += `This is a FOLLOW-UP email. Please reference previous conversation appropriately.\n`;
  } else {
    prompt += `This is an INITIAL contact email.\n`;
  }

  if (formData.qualificationInfo) {
    prompt += `Information needed to qualify the lead: ${formData.qualificationInfo}\n`;
  }

  if (formData.specialOffers) {
    // If specialOffers is an ID, we need to get the description
    // For now, we'll pass it as-is and handle it in the prompt building
    prompt += `Special offers available: ${formData.specialOffers}\n`;
  }

  if (formData.leadTimes) {
    prompt += `Lead times information: ${formData.leadTimes}\n`;
  }

  if (formData.postcode) {
    prompt += `Customer Postcode (for delivery quotes): ${formData.postcode}\n`;
  }

  if (formData.additionalContext) {
    prompt += `Additional context: ${formData.additionalContext}\n`;
  }

  if (formData.template) {
    // Replace common placeholders in template with actual values
    let processedTemplate = formData.template;
    
    // Replace placeholders with actual form data
    if (formData.recipientName) {
      processedTemplate = processedTemplate.replace(/\{\{customername\}\}/gi, formData.recipientName);
      processedTemplate = processedTemplate.replace(/\{\{customerName\}\}/gi, formData.recipientName);
      processedTemplate = processedTemplate.replace(/\{\{recipientName\}\}/gi, formData.recipientName);
    }
    
    // Replace postcode placeholder
    if (formData.postcode) {
      processedTemplate = processedTemplate.replace(/\{\{postcode\}\}/gi, formData.postcode);
    } else if (formData.additionalContext) {
      // Try to extract postcode if mentioned in additional context
      const postcodeMatch = formData.additionalContext.match(/\b[A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2}\b/i);
      if (postcodeMatch) {
        processedTemplate = processedTemplate.replace(/\{\{postcode\}\}/gi, postcodeMatch[0]);
      }
    }
    
    // Replace other common placeholders
    processedTemplate = processedTemplate.replace(/\{\{leadSource\}\}/gi, formData.leadSource || '');
    processedTemplate = processedTemplate.replace(/\{\{productType\}\}/gi, formData.productType || '');
    
    prompt += `\nUse this template as a base structure (placeholders have been replaced with actual values):\n${processedTemplate}\n`;
    prompt += `\nPlease enhance and personalize this template while maintaining its core structure and key information.`;
  }

  return prompt;
}

function buildSignature(signature: { name?: string; title?: string; phone?: string; email?: string; company?: string }): string {
  if (!signature.name && !signature.title && !signature.phone && !signature.email && !signature.company) {
    return '';
  }

  let sig = '';
  
  if (signature.name) {
    sig += signature.name;
  }
  
  if (signature.title) {
    sig += sig ? `\n${signature.title}` : signature.title;
  }
  
  if (signature.company) {
    sig += sig ? `\n${signature.company}` : signature.company;
  }
  
  if (signature.phone) {
    sig += sig ? `\nPhone: ${signature.phone}` : `Phone: ${signature.phone}`;
  }
  
  if (signature.email) {
    sig += sig ? `\nEmail: ${signature.email}` : `Email: ${signature.email}`;
  }

  return sig.trim();
}

export async function shortenEmail(subject: string, body: string): Promise<{ subject: string; body: string }> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  try {
    // Get or create assistant
    const assistantId = await getOrCreateAssistant();
    
    if (!assistantId) {
      throw new Error('Failed to get or create assistant');
    }

    console.log(`✂️ Shortening email using assistant ID: ${assistantId}`);

    // Create a thread
    const thread = await openai.beta.threads.create();

    // Build the shortening prompt
    const prompt = `Please condense the following email to be more concise while keeping ALL essential information:

Subject: ${subject}

Body:
${body}

Requirements:
- Keep all key information (recipient name, product details, special offers, lead times, contact info)
- Maintain the professional tone and style
- Preserve the call-to-action
- Make it shorter and more concise without losing important details
- Keep the email signature if present

Format your response as:
Subject: [shortened subject]

[shortened email body]`;

    // Add the user message to the thread
    await openai.beta.threads.messages.create(thread.id, {
      role: 'user',
      content: prompt,
    });

    // Run the assistant
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: assistantId,
    });
    
    console.log(`📧 Shortening run started with ID: ${run.id}`);

    // Wait for the run to complete
    let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    
    // Poll until the run is complete (with timeout)
    const maxWaitTime = 60000; // 60 seconds
    const startTime = Date.now();
    
    while (runStatus.status === 'queued' || runStatus.status === 'in_progress') {
      if (Date.now() - startTime > maxWaitTime) {
        throw new Error('Assistant run timed out');
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
      runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    }

    if (runStatus.status === 'failed') {
      throw new Error(`Assistant run failed: ${runStatus.last_error?.message || 'Unknown error'}`);
    }

    if (runStatus.status !== 'completed') {
      throw new Error(`Assistant run ended with status: ${runStatus.status}`);
    }

    // Get the messages from the thread
    const messages = await openai.beta.threads.messages.list(thread.id);
    const assistantMessage = messages.data.find(msg => msg.role === 'assistant');
    
    if (!assistantMessage || !assistantMessage.content[0] || assistantMessage.content[0].type !== 'text') {
      throw new Error('No response from assistant');
    }

    const response = assistantMessage.content[0].text.value;

    // Parse subject and body from response
    const subjectMatch = response.match(/Subject:\s*(.+?)(?:\n|$)/i);
    const shortenedSubject = subjectMatch ? subjectMatch[1].trim() : subject;
    
    // Extract body (everything after Subject line or the entire response)
    let shortenedBody = response;
    if (subjectMatch) {
      shortenedBody = response.substring(response.indexOf('\n') + 1).trim();
    }
    
    // Remove any remaining "Subject:" or "Body:" labels
    shortenedBody = shortenedBody.replace(/^(Subject|Body):\s*/gmi, '').trim();
    
    // Remove subject lines that appear anywhere in the body
    shortenedBody = shortenedBody.replace(/Subject:\s*[^\n]+\n/gi, '');
    shortenedBody = shortenedBody.replace(/\nSubject:\s*[^\n]+/gi, '');
    shortenedBody = shortenedBody.replace(/Subject:\s*[^\n]+$/gi, '');

    // Remove any signature-like text that might have been generated during shortening
    shortenedBody = shortenedBody.replace(/\n\s*\[Your Name\].*$/gmi, '');
    shortenedBody = shortenedBody.replace(/\n\s*\[Name\].*$/gmi, '');
    shortenedBody = shortenedBody.replace(/\n\s*Cheshire Stables.*CSGB Group.*$/gmi, '');
    shortenedBody = shortenedBody.replace(/\n\s*Cheshire Sheds.*$/gmi, ''); // Remove "Cheshire Sheds" at end
    shortenedBody = shortenedBody.replace(/\n\s*---.*$/gmi, '');
    
    // Remove company names after closings (e.g., "Warm regards, Cheshire Sheds" or "Warm regards,\nCheshire Sheds")
    shortenedBody = shortenedBody.replace(/(Warm regards|Best regards|Kind regards|Regards),?\s*\n?\s*Cheshire (Stables|Sheds|Sheds and Garden Buildings).*$/gmi, '$1,');
    shortenedBody = shortenedBody.replace(/(Warm regards|Best regards|Kind regards|Regards),?\s*,\s*Cheshire (Stables|Sheds|Sheds and Garden Buildings).*$/gmi, '$1,');
    
    // Remove company contact information patterns (address, phone, email at the end)
    // Multi-line pattern: Company name, address lines, Tel/Phone, email
    shortenedBody = shortenedBody.replace(/\n\s*Cheshire Stables\s*\n(?:\s*[^\n]+\n)*\s*(?:Tel|Phone):\s*\d+.*?\n\s*.*?@.*$/gmi, '');
    shortenedBody = shortenedBody.replace(/\n\s*[A-Z][a-z]+\s+House[^\n]*\n(?:\s*[^\n]+\n)*\s*(?:Tel|Phone):\s*\d+.*?\n\s*.*?@.*$/gmi, '');
    shortenedBody = shortenedBody.replace(/\n\s*Ibex House[^\n]*\n(?:\s*[^\n]+\n)*\s*(?:Tel|Phone):\s*\d+.*?\n\s*.*?@.*$/gmi, '');
    shortenedBody = shortenedBody.replace(/\n\s*Nat Lane[^\n]*\n(?:\s*[^\n]+\n)*\s*(?:Tel|Phone):\s*\d+.*?\n\s*.*?@.*$/gmi, '');
    shortenedBody = shortenedBody.replace(/\n\s*Winsford[^\n]*\n(?:\s*[^\n]+\n)*\s*(?:Tel|Phone):\s*\d+.*?\n\s*.*?@.*$/gmi, '');
    shortenedBody = shortenedBody.replace(/\n\s*Cheshire[^\n]*\n(?:\s*[^\n]+\n)*\s*(?:Tel|Phone):\s*\d+.*?\n\s*.*?@.*$/gmi, '');
    shortenedBody = shortenedBody.replace(/\n\s*CW7\s+\d+[A-Z]{2}[^\n]*\n(?:\s*[^\n]+\n)*\s*(?:Tel|Phone):\s*\d+.*?\n\s*.*?@.*$/gmi, '');
    
    // Remove any remaining company contact info after "Warm regards," or similar (single line patterns)
    shortenedBody = shortenedBody.replace(/(Warm regards|Best regards|Kind regards|Regards),?\s*\n\s*Cheshire (Stables|Sheds|Sheds and Garden Buildings).*$/gmi, '$1,');
    shortenedBody = shortenedBody.replace(/(Warm regards|Best regards|Kind regards|Regards),?\s*\n\s*[A-Z][a-z]+\s+House.*$/gmi, '$1,');
    shortenedBody = shortenedBody.replace(/(Warm regards|Best regards|Kind regards|Regards),?\s*\n\s*.*?(?:Tel|Phone):\s*\d+.*$/gmi, '$1,');
    shortenedBody = shortenedBody.replace(/(Warm regards|Best regards|Kind regards|Regards),?\s*\n\s*.*?@.*$/gmi, '$1,');
    
    // Remove multi-line company contact blocks that appear after a closing
    shortenedBody = shortenedBody.replace(/(Warm regards|Best regards|Kind regards|Regards),?\s*\n\s*Cheshire (Stables|Sheds|Sheds and Garden Buildings)\s*\n(?:\s*[^\n]+\n)*\s*(?:Tel|Phone|Ibex|Nat Lane|Winsford|CW7|sales@).*$/gmi, '$1,');
    
    shortenedBody = shortenedBody.trim();

    // Preserve the original user signature if it exists (it should be at the very end)
    // Extract signature from original body (look for pattern: name, title, company, phone, email)
    const originalSignatureMatch = body.match(/\n\n([A-Z][^\n]+\n(?:[^\n]+\n)*[^\n@]+\n(?:Phone|Email):[^\n]+(?:\nEmail:[^\n]+)?)$/);
    if (originalSignatureMatch) {
      // This looks like a user signature (has name, possibly title/company, and phone/email)
      const potentialSig = originalSignatureMatch[1];
      if (potentialSig.match(/(Phone|Email|@)/i)) {
        // This is likely the user signature, preserve it at the end
        // Remove any closing that might be before it in shortened version
        shortenedBody = shortenedBody.replace(/\n\n(Best regards|Kind regards|Warm regards|Regards),?\s*$/i, '');
        shortenedBody = shortenedBody.trim();
        // Ensure proper closing before signature
        const hasClosing = /(Best regards|Kind regards|Warm regards|Regards|Sincerely|Thank you|Thanks),?\s*$/i.test(shortenedBody);
        if (!hasClosing) {
          shortenedBody += '\n\nBest regards,';
        }
        shortenedBody += '\n\n' + potentialSig;
      }
    } else {
      // Ensure proper closing if no signature to preserve
      const hasClosing = /(Best regards|Kind regards|Warm regards|Regards|Sincerely|Thank you|Thanks),?\s*$/i.test(shortenedBody);
      if (!hasClosing && shortenedBody.length > 0) {
        shortenedBody += '\n\nBest regards,';
      }
    }

    return { subject: shortenedSubject, body: shortenedBody };
  } catch (error: any) {
    console.error('Error shortening email with assistant:', error);
    throw error;
  }
}
