import express from 'express';
import PageSnap from '@pagesnap/core';
import { loadConfig } from '@pagesnap/core/src/config.js';

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.post('/api/v1/convert', async (req, res) => {
  const { urls, ...options } = req.body;

  if (!urls || !Array.isArray(urls) || urls.length === 0) {
    return res.status(400).json({ error: 'Missing or invalid "urls" array in request body.' });
  }

  try {
    // In ESM, we must load config and initialize the PageSnap instance asynchronously.
    const config = await loadConfig(); // Assumes default config file location
    const converter = await new PageSnap(config).init();
    
    const results = await converter.capture(urls, options);

    if (converter.storageProvider.constructor.name === 'InMemoryProvider') {
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
});

app.listen(port, () => {
  console.log(`PageSnap API listening on port ${port}`);
});