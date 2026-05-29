import https from 'https';

const postData = JSON.stringify({
  email: `finaltest${Date.now()}@example.com`,
  referral_code: '568f91c5',
  coupon: 'DL100',
  success_url: 'https://destinylens.io/thank-you.html',
  cancel_url: 'https://destinylens.io/checkout.html'
});

const options = {
  hostname: 'www.destinylens.io',
  path: '/api/create-checkout-session',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    try {
      const result = JSON.parse(data);
      if (result.url) {
        console.log('Stripe URL:', result.url);
        console.log('\nComplete checkout to test full flow.');
      }
    } catch (e) {
      console.log('Error:', data);
    }
  });
});

req.write(postData);
req.end();
