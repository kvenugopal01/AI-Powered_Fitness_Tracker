require('dotenv').config();

async function listModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('❌ GEMINI_API_KEY is missing');
    return;
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
  console.log(`📡 Fetching models from: ${url.replace(apiKey, 'HIDDEN_KEY')}`);

  try {
    const res = await fetch(url);
    const data = await res.json();
    
    if (!res.ok) {
      console.error(`❌ Error ${res.status}:`, JSON.stringify(data));
      return;
    }

    console.log('✅ Available Models:');
    data.models.forEach(m => {
      console.log(`- ${m.name} (${m.displayName}) [${m.supportedGenerationMethods.join(', ')}]`);
    });
  } catch (err) {
    console.error(`💥 Error: ${err.message}`);
  }
}

listModels();
