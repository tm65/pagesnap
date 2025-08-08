import PageSnap from './main.js';
import { loadConfig } from './config.js';

async function runTest() {
  console.log('--- Starting PageSnap Core Test ---');
  
  try {
    // 1. Load configuration
    const config = await loadConfig();
    console.log('Config loaded successfully.');
    
    // Ensure we are using a local filesystem for this test
    config.output.storage.provider = 'filesystem';
    config.output.storage.path = './snapshots'; // Ensure this directory exists
    config.output.storage.formats = ['png']; // Keep it simple for the test

    // 2. Initialize PageSnap
    // We pass `null` for the browser to let the class launch its own.
    const converter = await new PageSnap(config, null).init();
    console.log('PageSnap initialized successfully.');
    console.log(`Storage provider: ${converter.storageProvider.constructor.name}`);

    // 3. Define input and capture
    const urls = ['https://example.com'];
    console.log(`Capturing URL: ${urls[0]}`);
    
    const results = await converter.capture(urls);

    // 4. Log results
    console.log('--- Capture Complete ---');
    console.log('Results:', JSON.stringify(results, null, 2));
    
    if (results && results[0] && results[0].path) {
      console.log(`
✅ Success! Screenshot saved to: ${results[0].path}`);
    } else {
      console.error(`❌ Failure! No path was returned in the result.`);
    }

  } catch (error) {
    console.error('\n--- An Unhandled Error Occurred ---');
    console.error(error);
  } finally {
    console.log('\n--- Test Finished ---');
  }
}

runTest();
