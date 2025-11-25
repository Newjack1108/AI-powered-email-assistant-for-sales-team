import type { NextApiRequest, NextApiResponse } from 'next';
import { saveTemplate, initDb } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

// This endpoint allows adding the default template
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  await initDb();

  try {
    const template = {
      id: uuidv4(),
      name: 'Facebook Enquiry - Field Shelter Quotation',
      subject: 'Quotation for 24ft x 12ft Double Field Shelter',
      body: `Dear {{customername}},

Thank you for your Facebook enquiry. Please find attached a quotation for the 24ft x 12ft double field shelter, including delivery and installation to {{postcode}}

We are pleased to offer a 10% discount on the building costs if ordered this month only. Please note that the discount can be reverted to standard at any point due to material cost increases.

You can also review our field shelter options in the attached brochure and plans for this building.

We offer the option for you to collect the shelter, with collection available 48 hours from order. Alternatively, delivery can be arranged within 2-4 weeks, with delivery costs quoted upon application.

Thank you for considering us for your project. You can find more details about our field shelters on our website: CSGB Group and the specific product here: 24ft x 12ft Double Field Shelter

Our current next available delivery or delivery and installation dates are:

Delivery only date: [Insert Date]
Delivery and installation: [Insert Date]

Dates are subject to change due to demand from new orders.

We're happy to discuss the quotation further and make any necessary amendments. Please let us know if you require any changes.

To help us assist you best, please reply to this email or call us with one of the following:

Discuss/Amend: You'd like to discuss the quotation further or request an amendment. Please suggest a few days and times that work best for a call.

Quotation OK: You're happy with the quotation as is. (A brief confirmation would be appreciated.)

Not Interested: You're not interested in proceeding and do not wish to be contacted further.

You can also reach us at 01606 352352 if you prefer to discuss this over the phone.

We look forward to hearing from you.

Best regards,`,
      attachments: null,
    };

    await saveTemplate(template);

    return res.status(200).json({ success: true, id: template.id, message: 'Template added successfully' });
  } catch (error: any) {
    console.error('Error adding template:', error);
    return res.status(500).json({ error: 'Failed to add template', message: error.message });
  }
}

