require('dotenv').config();

const GEMINI_MODEL = 'gemini-pro-latest';
const GEMINI_API_URL = (model) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

async function main() {
  const apiKey = process.env.GEMINI_API_KEY;
  const url = `${GEMINI_API_URL(GEMINI_MODEL)}?key=${apiKey}`;
  const body = {
    contents: [{ parts: [{ text: 'Respond with "PRO_WORKING" if you can hear me.' }] }]
  };

  try {
    const res = await fetch(url, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    });

    const data = await res.json();
    if (res.ok) {
      console.log('✅ AI Pro Connection Success!');
      console.log('Response:', data.candidates[0].content.parts[0].text);
    } else {
      console.error('❌ AI Pro Connection Failed:', JSON.stringify(data));
    }
  } catch (err) {
    console.error('💥 Network Error:', err.message);
  }
}

main();
