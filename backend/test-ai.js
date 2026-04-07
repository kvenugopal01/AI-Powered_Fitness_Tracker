require('dotenv').config();

const GEMINI_MODEL = 'gemini-1.5-flash';
const GEMINI_API_URL = (model) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

async function testGemini() {
  const apiKey = process.env.GEMINI_API_KEY;
  console.log(`🔑 Key found: ${apiKey ? 'Yes (Length: ' + apiKey.length + ')' : 'No'}`);
  
  if (!apiKey) return;

  const body = {
    contents: [{ role: 'user', parts: [{ text: 'Hello, are you working?' }] }],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 100,
    },
  };

  const url = `${GEMINI_API_URL(GEMINI_MODEL)}?key=${apiKey}`;
  
  console.log(`📡 Calling: ${url.replace(apiKey, 'HIDDEN_KEY')}`);

  try {
    const res = await fetch(url, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    });

    console.log(`📉 Status: ${res.status} ${res.statusText}`);
    
    const text = await res.text();
    if (!res.ok) {
      console.error(`❌ API Error: ${text}`);
    } else {
      console.log(`✅ Success! Response preview: ${text.substring(0, 200)}...`);
    }
  } catch (error) {
    console.error(`💥 Network Error: ${error.message}`);
  }
}

testGemini();
