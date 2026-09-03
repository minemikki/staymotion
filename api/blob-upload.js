// Authorizes and receives photo uploads straight to Vercel Blob (client
// upload, so big/many files never hit the function body limit). Only uploads
// carrying a valid signed order token are allowed. On completion the owner is
// emailed a link to each uploaded file.

import { handleUpload } from '@vercel/blob/client';
import { verifyOrder } from '../lib/token.js';
import { sendEmail } from '../lib/email.js';

export default async function handler(req, res) {
  try {
    const json = await handleUpload({
      request: req,
      body: req.body,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const order = verifyOrder(clientPayload);
        if (!order) throw new Error('Ugyldig eller utløpt ordre');
        return {
          allowedContentTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'],
          maximumSizeInBytes: 30 * 1024 * 1024,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ orderId: order.orderId, pkg: order.pkg }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        const info = JSON.parse(tokenPayload || '{}');
        const owner = process.env.OWNER_EMAIL || 'hello@staymotion.no';
        await sendEmail({
          to: owner,
          subject: `Nye bilder lastet opp — ordre ${info.orderId}`,
          html: `<p>Ordre <b>${info.orderId}</b> (${info.pkg})</p>
            <p>Fil: <a href="${blob.url}">${blob.pathname}</a></p>`,
        });
      },
    });
    res.json(json);
  } catch (e) {
    console.error('[blob-upload]', e);
    res.status(400).json({ error: e.message });
  }
}
