const { Client } = require('pg');

const regions = [
  'ap-southeast-1', 'ap-southeast-2', 'ap-southeast-3',
  'ap-northeast-1', 'ap-northeast-2', 'ap-south-1',
  'us-east-1', 'us-east-2', 'us-west-1', 'us-west-2',
  'eu-central-1', 'eu-west-1', 'eu-west-2', 'eu-west-3',
  'sa-east-1', 'ca-central-1'
];

async function testRegion(region) {
  const connectionString = `postgresql://postgres.izqrlblxbajnaovelvef:UkAeESxGBCJEW6iQ@aws-0-${region}.pooler.supabase.com:6543/postgres`;
  const client = new Client({
    connectionString,
    connectionTimeoutMillis: 5000,
  });
  
  try {
    await client.connect();
    console.log(`SUCCESS: Region is ${region}`);
    await client.end();
    process.exit(0);
  } catch (err) {
    if (err.message.includes('not found')) {
      // console.log(`${region}: tenant not found`);
    } else {
      // console.log(`${region}: ${err.message}`);
    }
  }
}

async function run() {
  console.log('Testing regions...');
  await Promise.all(regions.map(r => testRegion(r)));
  console.log('Finished testing all regions.');
}

run();
