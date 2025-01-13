import { Computer } from '../lib/computer';

async function main() {
  const computer = new Computer();

  await computer.connect();

  // wait for 2 seconds
  await new Promise((resolve) => setTimeout(resolve, 2000));

  console.log('Metadata:', computer.machineMetadata);

  console.log('Video stream URL:', await computer.videoStreamUrl());

  await computer.do('Tell me the weather in Tokyo');

  await computer.close();
}

await main();
