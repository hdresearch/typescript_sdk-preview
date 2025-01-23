import { Computer } from '../lib';

async function testNodeComputer() {
  console.log('Testing Computer SDK with Node.js...');

  const computer = new Computer({
    apiKey: process.env.HDR_API_KEY,
  });

  try {
    console.log('Connecting to computer...');
    await computer.connect();

    console.log('Getting metadata...');
    const metadata = await computer.getMetadata();
    console.log('Metadata:', metadata);

    await computer.close();
    console.log('Test completed successfully');
  } catch (error) {
    console.error('Test failed:', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack,
      });
    }
    process.exit(1);
  }
}

testNodeComputer().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
