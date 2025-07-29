#!/usr/bin/env node

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import PageSnap from './main.js';
import { loadConfig } from './config.js';

async function main() {
  const argv = yargs(hideBin(process.argv))
    .usage('Usage: $0 <urls...> [options]')
    .command('$0 <urls...>', 'Capture screenshots of one or more webpages', (yargs) => {
      yargs.positional('urls', {
        describe: 'One or more space-separated URLs to capture',
        type: 'string',
      });
    })
    .option('c', {
      alias: 'config',
      describe: 'Path to a custom config file',
      type: 'string',
    })
    .option('x', { describe: 'X coordinate of the capture region', type: 'number' })
    .option('y', { describe: 'Y coordinate of the capture region', type: 'number' })
    .option('width', { describe: 'Width of the capture region', type: 'number' })
    .option('height', { describe: 'Height of the capture region', type: 'number' })
    .help('h')
    .alias('h', 'help')
    .argv;

  if (argv.urls.length > 0) {
    try {
      const config = await loadConfig(argv.config);
      const converter = await new PageSnap(config).init();
      
      console.log('Starting capture...');

      // Prepare region options for capture
      const options = {};
      if (argv.x !== undefined && argv.y !== undefined && argv.width && argv.height) {
        options.clip = {
          x: argv.x,
          y: argv.y,
          width: argv.width,
          height: argv.height,
        };
      }

      const results = await converter.capture(argv.urls, options);
      
      console.log('\nCapture complete.');
      console.log(JSON.stringify(results, null, 2));
      process.exit(0);
    } catch (error) {
      console.error('\nAn unexpected error occurred:', error);
      process.exit(1);
    }
  } else {
      yargs.showHelp();
  }
}

main();
