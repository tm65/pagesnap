import { Queue } from 'bullmq';

const myQueue = new Queue('screenshotJobs');

async function addJob() {
  console.log('Adding job to the queue...');
  await myQueue.add('processUrl', { url: 'https://example.com' });
  console.log('Job added successfully!');
  process.exit();
}

addJob();
