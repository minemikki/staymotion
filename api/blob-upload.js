// Authorizes and receives photo uploads straight to Vercel Blob (client
// upload, so big/many files never hit the function body limit). Only uploads
// carrying a valid signed order token are allowed. On completion the owner is
// emailed a link to each uploaded file.

import { handleUpload } from '@vercel/blob/client';
import { verifyOrder } from '../lib/token.js';

export default async function handler(req, res) {
  try {
    const json = await handleUpload({
      request: req,
      body: req.body,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const order = verifyOrder(clientPayload);
        if (!order) throw new Error('Ugyldig eller utløpt ordre');
        // Photos may only be written under this order's own folder.
        const prefix = 'orders/' + order.orderId + '/';
        if (order.orderId && !pathname.startsWith(prefix)) {
          throw new Error('Ugyldig filsti');
        }
        return {
          allowedContentTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'],
          maximumSizeInBytes: 30 * 1024 * 1024,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ orderId: order.orderId }),
        };
      },
      // Photos land in the order folder; the admin dashboard reads them from
      // there, so no per-file email is needed (the order email already fired).
      onUploadCompleted: async () => {},
    });
    res.json(json);
  } catch (e) {
    console.error('[blob-upload]', e);
    res.status(400).json({ error: e.message });
  }
}
