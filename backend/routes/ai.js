// routes/ai.js
// Server-side proxy for all Gemini AI calls.
// Keeps the GEMINI_API_KEY on the server and off the client.
//
// POST /api/ai/chat              → generateResponse()
// POST /api/ai/workout-plan      → generateWorkoutPlan()
// POST /api/ai/workout-structured→ generateStructuredWorkout()
// POST /api/ai/nutrition         → analyzeNutrition()
// POST /api/ai/meal-photo        → analyzeMealPhoto()
// POST /api/ai/posture           → analyzePosture()
// POST /api/ai/exercise-guide    → getExerciseGuide()

const express = require('express');
const router  = express.Router();
const authMiddleware = require('../middleware/authMiddleware');

// Apply authMiddleware to all routes in this router
router.use(authMiddleware);

// ── Gemini REST helper ───────────────────────────────────────────────────────

const GEMINI_MODEL     = 'gemini-flash-latest';
const GEMINI_PRO_MODEL = 'gemini-flash-latest'; // Fallback to Flash due to Pro quota exhaustion

const GEMINI_API_URL = (model) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

/**
 * Call the Gemini generateContent REST endpoint.
 *
 * @param {object[]} contents     – Gemini `contents` array
 * @param {object}   config       – optional generationConfig / responseMimeType / systemInstruction
 * @returns {Promise<string>}     – raw text from the model
 */
async function callGemini(contents, config = {}) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('❌ [AI] GEMINI_API_KEY is missing from environment variables');
    throw new Error('GEMINI_API_KEY is not configured on the server.');
  }

  let model = GEMINI_MODEL;
  if (config.usePro || config.useThinking) model = GEMINI_PRO_MODEL;

  const body = {
    contents,
    ...(config.systemInstruction && {
      system_instruction: { parts: [{ text: config.systemInstruction }] },
    }),
    generationConfig: {
      ...(config.responseMimeType && { responseMimeType: config.responseMimeType }),
      temperature: config.temperature ?? 0.7,
      topP: 0.95,
      topK: 40,
      maxOutputTokens: 2048,
    },
  };

  const url = `${GEMINI_API_URL(model)}?key=${apiKey}`;
  
  // DEBUG: Log request (omit full key for security)
  console.log(`📡 [AI] Calling Gemini (${model})...`);

  try {
    const res = await fetch(url, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      let errJson;
      try { errJson = JSON.parse(errText); } catch { errJson = null; }
      
      console.error(`❌ [AI] Gemini API error ${res.status}:`, errJson || errText);
      
      const message = errJson?.error?.message || errText || 'Unknown Gemini error';
      throw new Error(`Gemini API error ${res.status}: ${message}`);
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    
    if (!text) {
      console.warn('⚠️ [AI] Gemini returned an empty response:', JSON.stringify(data));
    }

    return text;
  } catch (error) {
    console.error('💥 [AI] Network or Parsing Error:', error.message);
    throw error;
  }
}

/** Build a simple text-only `contents` array */
const textContent = (prompt) => [{ role: 'user', parts: [{ text: prompt }] }];

/** Build a multimodal `contents` array (text + base64 image) */
const imageContent = (prompt, base64, mimeType = 'image/jpeg') => [
  {
    role: 'user',
    parts: [
      { text: prompt },
      { inline_data: { mime_type: mimeType, data: base64 } },
    ],
  },
];

// ── Route handlers ───────────────────────────────────────────────────────────

// POST /api/ai/chat
// Body: { prompt, systemInstruction? }
// Mirrors: GeminiService.generateResponse()
router.post('/chat', async (req, res, next) => {
  const { prompt, systemInstruction } = req.body;
  if (!prompt) return res.status(400).json({ error: '`prompt` is required.' });

  try {
    const text = await callGemini(textContent(prompt), {
      systemInstruction:
        systemInstruction ||
        `You are BFit AI, an elite personal trainer and nutritionist. 
        Your goal is to provide concise, science-backed, and highly motivating advice. 
        Always prioritize user safety. If asked about injuries, recommend consulting a doctor.
        Keep your personality energetic, professional, and empathetic.`,
    });
    res.json({ text });
  } catch (err) {
    next(err);
  }
});

// POST /api/ai/workout-plan
// Body: { goals, profile: { age, height, weight } }
// Mirrors: GeminiService.generateWorkoutPlan()
router.post('/workout-plan', async (req, res, next) => {
  const { goals, profile } = req.body;
  if (!goals || !profile) return res.status(400).json({ error: '`goals` and `profile` are required.' });

  const prompt = `Generate a detailed workout plan for a user with the following profile:
Age: ${profile.age}, Height: ${profile.height}cm, Weight: ${profile.weight}kg.
Fitness Goals: ${goals}.
Please include specific exercises, sets, reps, and a weekly schedule.`;

  try {
    const text = await callGemini(textContent(prompt), {
      systemInstruction: `You are an world-class Strength and Conditioning Coach. 
      Design programs that utilize progressive overload, specific exercise selection for the user's goals, 
      and include clear indicators for intensity (RPE or % of 1RM). Ensure the plan is balanced and prevents overtraining.`,
    });
    res.json({ text });
  } catch (err) {
    next(err);
  }
});

// POST /api/ai/workout-structured
// Body: { profile: UserProfileData, goals: string }
// Mirrors: GeminiService.generateStructuredWorkout()
// Returns: AIExercise[]
router.post('/workout-structured', async (req, res, next) => {
  const { profile, goals } = req.body;
  if (!profile || !goals) return res.status(400).json({ error: '`profile` and `goals` are required.' });

  const prompt = `Generate a single-day workout plan for a user with the following profile:
Name: ${profile.name}, Age: ${profile.age}, Height: ${profile.height}cm, Weight: ${profile.weight}kg.
Daily Targets: ${profile.calorieGoal}kcal, ${profile.proteinGoal}g protein, ${profile.stepGoal} steps.
Additional Goals: ${goals}.

Return a JSON array of exercises. Each exercise object must have:
- name: string (exercise name)
- sets: number
- reps: number or string (e.g. "12" or "to failure")
- duration: number (estimated duration in minutes)
- calories: number (estimated calories burned)

Format the response as a JSON array of objects only.`;

  try {
    const raw = await callGemini(textContent(prompt), { 
      responseMimeType: 'application/json',
      usePro: true, // Use Pro for better structured workout planning
      systemInstruction: 'You are a data-driven fitness scheduler. Output ONLY valid JSON arrays of exercises.'
    });
    let exercises;
    try {
      exercises = JSON.parse(raw);
    } catch (parseErr) {
      console.error('❌ [AI] Failed to parse structured workout JSON:', raw);
      exercises = [];
    }
    res.json({ exercises });
  } catch (err) {
    next(err);
  }
});

// POST /api/ai/nutrition
// Body: { mealLog: string, profile: UserProfile }
// Mirrors: GeminiService.analyzeNutrition()
// Returns: { advice: string, itemsToRemove: string[] }
router.post('/nutrition', async (req, res, next) => {
  const { mealLog, profile } = req.body;
  if (!mealLog || !profile) return res.status(400).json({ error: '`mealLog` and `profile` are required.' });

  const prompt = `Analyze the following meal log for a user with these goals: ${profile.goals || 'General health'}.
User Profile: Age ${profile.age}, Weight ${profile.weight}kg, Calorie Goal ${profile.calorieGoal}kcal.

Meal Log:
${mealLog}

Provide:
1. Overall dietary advice and insights based on their goals and current intake.
2. A list of specific items from the log that should be removed or significantly reduced for better health. IMPORTANT: Use the EXACT names as provided in the log.

Format the response as JSON:
{
  "advice": "...",
  "itemsToRemove": ["Exact Item Name 1", "Exact Item Name 2"]
}`;

  try {
    const raw = await callGemini(textContent(prompt), { 
      responseMimeType: 'application/json',
      usePro: true, // Significant reasoning needed for nutrition analysis
      systemInstruction: `You are a clinical nutritionist and dietitian. 
      Analyze logs for caloric density, macronutrient balance, micronutrient potential, and glycemic impact. 
      Be specific and data-oriented in your advice.`
    });
    let result;
    try {
      result = JSON.parse(raw);
    } catch (parseErr) {
      console.error('❌ [AI] Failed to parse nutrition analysis JSON:', raw);
      result = { advice: 'Could not analyze diet.', itemsToRemove: [] };
    }
    res.json({
      advice:        result.advice        || 'Could not analyze diet.',
      itemsToRemove: result.itemsToRemove || [],
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/ai/meal-photo
// Body: { base64Image: string, mimeType?: string }
// Mirrors: GeminiService.analyzeMealPhoto()
// Returns: MealAnalysis { name, calories, protein, carbs, fat, analysis }
router.post('/meal-photo', async (req, res, next) => {
  const { base64Image, mimeType = 'image/jpeg' } = req.body;
  if (!base64Image) return res.status(400).json({ error: '`base64Image` is required.' });

  const prompt = `Analyze this meal photo and estimate its nutritional content.
Provide:
1. Name of the meal.
2. Estimated calories (number).
3. Estimated protein in grams (number).
4. Estimated carbohydrates in grams (number).
5. Estimated fat in grams (number).
6. A brief analysis of the meal's healthiness.

Format the response as JSON:
{
  "name": "...",
  "calories": 0,
  "protein": 0,
  "carbs": 0,
  "fat": 0,
  "analysis": "..."
}`;

  try {
    const raw = await callGemini(imageContent(prompt, base64Image, mimeType), {
      responseMimeType: 'application/json',
      systemInstruction: 'You are an expert in computer vision for food analysis. Estimate portion sizes and nutritional values with high accuracy.'
    });
    let result;
    try {
      result = JSON.parse(raw);
    } catch (parseErr) {
      console.error('❌ [AI] Failed to parse meal photo analysis JSON:', raw);
      throw new Error('Failed to parse meal analysis response.');
    }
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/ai/posture
// Body: { base64Image: string, mimeType?: string }
// Mirrors: GeminiService.analyzePosture()
// Returns: PostureAnalysis { isCorrect, feedback, suggestions[] }
router.post('/posture', async (req, res, next) => {
  const { base64Image, mimeType = 'image/jpeg' } = req.body;
  if (!base64Image) return res.status(400).json({ error: '`base64Image` is required.' });

  const prompt = `Analyze the posture in this photo.
Determine if the posture is correct or not for the activity being performed (e.g., standing, sitting, lifting).
Provide:
1. Whether the posture is correct (boolean).
2. Detailed feedback on what is right or wrong.
3. Specific suggestions for improvement.

Format the response as JSON:
{
  "isCorrect": true,
  "feedback": "...",
  "suggestions": ["...", "..."]
}`;

  try {
    const raw = await callGemini(imageContent(prompt, base64Image, mimeType), {
      responseMimeType: 'application/json',
      useThinking: true, // Use thinking model for complex kinesiology
      systemInstruction: `You are an expert kinesiologist and physical therapist. 
      Examine joint angles, spinal alignment, and base of support in the photo. 
      Provide highly specific, biomechanically sound feedback and corrective exercises.`
    });
    let result;
    try {
      result = JSON.parse(raw);
    } catch (parseErr) {
      console.error('❌ [AI] Failed to parse posture analysis JSON:', raw);
      throw new Error('Failed to parse posture analysis response.');
    }
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/ai/exercise-guide
// Body: { exerciseName: string, workoutDetails?: string }
// Mirrors: GeminiService.getExerciseGuide()
// Returns: ExerciseGuide { instructions, youtubeQuery, recommendedReps, recommendedSets }
router.post('/exercise-guide', async (req, res, next) => {
  const { exerciseName, workoutDetails = 'None' } = req.body;
  if (!exerciseName) return res.status(400).json({ error: '`exerciseName` is required.' });

  const prompt = `Provide a comprehensive guide on how to perform the exercise: "${exerciseName}".
Details from workout: ${workoutDetails}

Include:
1. Step-by-step instructions on how to perform the exercise.
2. Proper form and technique.
3. Common mistakes to avoid.
4. Safety tips.
5. Recommended reps and sets if not specified.

Also, provide a short search query that would find the best instructional video for this exercise on YouTube.

Format the response as JSON:
{
  "instructions": "...",
  "youtubeQuery": "...",
  "recommendedReps": "...",
  "recommendedSets": "..."
}`;

  try {
    const raw = await callGemini(textContent(prompt), { responseMimeType: 'application/json' });
    let result;
    try {
      result = JSON.parse(raw);
    } catch {
      result = {};
    }
    res.json({
      instructions:    result.instructions    || 'No instructions available.',
      youtubeQuery:    result.youtubeQuery     || exerciseName,
      recommendedReps: result.recommendedReps  || '10-12',
      recommendedSets: result.recommendedSets  || '3',
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
