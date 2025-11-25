import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

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

export async function generateEmail(formData: EmailFormData): Promise<{ subject: string; body: string }> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  const prompt = buildPrompt(formData);

  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4o', // Use gpt-4o as default (more recent and available)
    messages: [
      {
        role: 'system',
        content: 'You are a professional sales email assistant. Write clear, professional, and engaging sales emails that are personalized and effective. Always maintain a professional yet friendly tone.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    temperature: 0.7,
  });

  const response = completion.choices[0]?.message?.content || '';
  
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
}

function buildPrompt(formData: EmailFormData): string {
  const companyName = 'Cheshire Sheds and garden buildings ltd (CSGB Group) T/A Cheshire Stables, Cheshire Sheds and Beaver Log Cabins';
  
  let prompt = `Write a professional sales email with the following details:\n\n`;

  prompt += `Company Name: ${companyName}\n\n`;

  if (formData.recipientName) {
    prompt += `Recipient: ${formData.recipientName}\n`;
  }
  prompt += `Email: ${formData.recipientEmail}\n\n`;

  if (formData.leadSource) {
    prompt += `Lead Source: ${formData.leadSource}\n`;
  }

  if (formData.productType) {
    prompt += `Product Type Customer is Interested In: ${formData.productType}\n`;
    prompt += `Make sure to reference this product type and highlight relevant features and benefits.\n`;
  }

  if (formData.urgency) {
    prompt += `Urgency Level: ${formData.urgency}\n`;
  }

  if (formData.isFollowUp) {
    prompt += `This is a FOLLOW-UP email. Reference previous conversation appropriately.\n`;
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
  }

  prompt += `\nPlease write a professional email that:\n`;
  prompt += `- Is personalized and engaging\n`;
  prompt += `- Addresses the specific context provided\n`;
  prompt += `- Includes a clear call-to-action\n`;
  prompt += `- Maintains a professional yet friendly tone\n`;
  prompt += `- Is concise but comprehensive\n`;
  prompt += `- Naturally incorporates the company name: ${companyName}\n`;
  if (formData.productType) {
    prompt += `- Focuses on the customer's interest in ${formData.productType}\n`;
  }
  prompt += `\nFormat your response as:\nSubject: [email subject]\n\n[email body]`;

  return prompt;
}

