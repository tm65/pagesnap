import { Worker } from 'bullmq';

console.log('Worker started, waiting for jobs...');

const worker = new Worker('screenshotJobs', async job => {
  console.log('--- Job Received ---');
  console.log(`Processing job: ${job.id}`);
  console.log('Job data:', job.data);
  
  // Simulate work
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  console.log(`Finished processing job: ${job.id}`);
  console.log('--------------------');
});

worker.on('completed', job => {
  console.log(`Job ${job.id} has completed!`);
});

worker.on('failed', (job, err) => {
  console.log(`Job ${job.id} has failed with error ${err.message}`);
});
