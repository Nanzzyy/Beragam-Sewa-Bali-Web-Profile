const https = require('https');
require('dotenv').config();

const url = new URL(process.env.SUPABASE_URL + '/rest/v1/site_content?select=*&limit=1');
const options = {
  hostname: url.hostname,
  path: url.pathname + url.search,
  headers: {
    'apikey': process.env.SUPABASE_KEY.trim(),
    'Authorization': 'Bearer ' + process.env.SUPABASE_KEY.trim()
  }
};

const req = https.get(options, (res) => {
  console.log('STATUS:', res.statusCode);
  res.on('data', (d) => process.stdout.write(d));
});
req.on('error', (e) => console.error(e));
req.end();
