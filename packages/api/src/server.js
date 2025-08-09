import express from 'express';
import crypto from 'crypto';
import PageSnap from '@pagesnap/core';
import { loadConfig } from '@pagesnap/core/src/config.js';
import { ssrfProtection } from './ssrf-protection.js';

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.post('/api/v1/convert', ssrfProtection, async (req, res) => {
  const { urls, watermark, callbackUrl, ...options } = req.body;

  if (!urls || !Array.isArray(urls) || urls.length === 0) {
    return res.status(400).json({ error: 'Missing or invalid "urls" array in request body.' });
  }

  if (callbackUrl) {
    res.status(202).json({ message: 'Request accepted. Results will be sent to the callback URL.' });
    
    // Process asynchronously
    processRequest(urls, watermark, options, callbackUrl);

  } else {
    // Process synchronously
    try {
      const results = await processRequest(urls, watermark, options);
      
      if (results[0].path && results[0].path.startsWith('in-memory://')) {
        const responseResults = results.map(result => {
          if (result.path && result.path.startsWith('in-memory://')) {
            const fileName = result.path.split('://')[1];
            const data = converter.storageProvider.get(fileName);
            return {
              ...result,
              imageData: data ? data.toString('base64') : null,
              path: undefined,
            };
          }
          return result;
        });
        return res.status(200).json({ results: responseResults });
      }
      
      res.status(200).json({ results });

    } catch (error) {
      console.error('API Error:', error);
      res.status(500).json({ error: 'An internal error occurred during conversion.' });
    }
  }
});

async function processRequest(urls, watermark, options, callbackUrl = null) {
  try {
    const config = await loadConfig();
    if (watermark) {
      config.watermark = { ...config.watermark, ...watermark };
    }
    if (!callbackUrl) {
      config.output.storage.provider = 'in-memory';
    }

    const converter = await new PageSnap(config).init();
    const results = await converter.capture(urls, options);

    if (callbackUrl) {
      // Send results to callback URL
      fetch(callbackUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ results }),
      }).catch(err => console.error(`Failed to send webhook to ${callbackUrl}`, err));
    } else {
      return results;
    }
  } catch (error) {
    if (callbackUrl) {
      fetch(callbackUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: error.message }),
      }).catch(err => console.error(`Failed to send error webhook to ${callbackUrl}`, err));
    } else {
      throw error;
    }
  }
}

app.post('/api/v1/render/html', async (req, res) => {
// ... (HTML rendering endpoint)
});

// (existing endpoints)

const RENDER_SECRET = process.env.PAGESNAP_RENDER_SECRET || 'a-very-secret-key';

function verifyHmac(req, res, next) {
  const { signature, ...params } = req.query;
  if (!signature) {
    return res.status(401).send('Missing signature.');
  }

  const orderedParams = Object.keys(params).sort().map(key => `${key}=${params[key]}`).join('&');
  const hmac = crypto.createHmac('sha256', RENDER_SECRET);
  hmac.update(orderedParams);
  const expectedSignature = hmac.digest('hex');

  if (crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    return next();
  }

  res.status(401).send('Invalid signature.');
}

app.get('/render/v1/direct', verifyHmac, ssrfProtection, async (req, res) => {
  const { url, ...options } = req.query;

  if (!url) {
    return res.status(400).send('Missing "url" query parameter.');
  }

  // TODO: Implement HMAC signature validation for security

  try {
    const config = await loadConfig();
    // Force in-memory storage for direct rendering
    config.output.storage.provider = 'in-memory';
    
    const converter = await new PageSnap(config).init();
    const results = await converter.capture([url], options);

    if (results && results[0] && !results[0].error) {
      const imageResult = results.find(r => r.format === 'png' || r.format === 'jpg');
      if (imageResult && imageResult.path.startsWith('in-memory://')) {
        const fileName = imageResult.path.split('://')[1];
        const data = converter.storageProvider.get(fileName);
        if (data) {
          res.setHeader('Content-Type', `image/${imageResult.format}`);
          return res.send(data);
        }
      }
    }
    
    res.status(500).send('Failed to generate image.');

  } catch (error) {
    console.error('Direct Render Error:', error);
    res.status(500).send('An internal error occurred.');
  }
});

app.listen(port, () => {
  console.log(`PageSnap API listening on port ${port}`);
});
