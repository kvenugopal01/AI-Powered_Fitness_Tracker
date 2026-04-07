async function testAuth() {
  const url = 'http://localhost:3000/api/auth/google';
  console.log(`📡 Sending test request to ${url}...`);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: 'DUMMY_TOKEN' }),
    });

    console.log(`📉 Status: ${res.status}`);
    const json = await res.json();
    console.log('📦 Response JSON:', JSON.stringify(json, null, 2));
  } catch (err) {
    console.error(`💥 Error calling auth: ${err.message}`);
  }
}

testAuth();
