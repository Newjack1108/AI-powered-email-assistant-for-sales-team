import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

// Assistant ID - will be created on first use if not set
let assistantId: string | null = process.env.OPENAI_ASSISTANT_ID || null;

export interface EmailFormData {
  recipientName?: string;
  recipientEmail: string;
  leadSource?: string;
  productType?: string;
  urgency?: string;
  isFollowUp?: boolean;
  qualificationInfo?: string;
  specialOffers?: string;
  leadTimes?: string;
  additionalContext?: string;
  template?: string;
  useTemplateDirectly?: boolean;
  postcode?: string;
}

// Create or get the assistant
async function getOrCreateAssistant(): Promise<string> {
  if (assistantId) {
    try {
      // Verify the assistant exists
      await openai.beta.assistants.retrieve(assistantId);
      return assistantId;
    } catch (error) {
      console.log('Assistant not found, creating new one...');
      assistantId = null;
    }
  }

  // Create a new assistant
  const assistant = await openai.beta.assistants.create({
    name: 'Sales Email Assistant',
    instructions: buildAssistantInstructions(),
    model: process.env.OPENAI_MODEL || 'gpt-4o',
    temperature: 0.7,
  });

  assistantId = assistant.id;
  console.log(`Created new assistant with ID: ${assistantId}`);
  console.log(`Add this to your Railway environment variables: OPENAI_ASSISTANT_ID=${assistantId}`);
  
  return assistantId;
}

function buildAssistantInstructions(): string {
  const companyName = 'Cheshire Sheds and garden buildings ltd (CSGB Group) T/A Cheshire Stables, Cheshire Sheds and Beaver Log Cabins';
  
  return `You are a professional sales email assistant for ${companyName}.

Your role is to write clear, professional, and engaging sales emails that are personalized and effective.

Key Guidelines:
- Always maintain a professional yet friendly tone
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

When writing emails:
1. Always start with a personalized greeting using the customer's name if provided
2. Reference how they found us (lead source) when relevant
3. Highlight relevant product features and benefits based on their interest
4. Address any urgency or time-sensitive offers
5. Include qualification questions if needed
6. Mention special offers and lead times when provided
7. End with a clear call-to-action and contact information

Format your response as:
Subject: [email subject]

[email body]

The email should be professional, engaging, and tailored to the specific customer's needs and situation.`;
}

export async function generateEmail(formData: EmailFormData): Promise<{ subject: string; body: string }> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  try {
    // Get or create assistant
    const assistant = await getOrCreateAssistant();

    // Create a thread
    const thread = await openai.beta.threads.create();

    // Build the user prompt
    const prompt = buildPrompt(formData);

    // Add the user message to the thread
    await openai.beta.threads.messages.create(thread.id, {
      role: 'user',
      content: prompt,
    });

    // Run the assistant
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: assistant,
    });

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
