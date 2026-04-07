// routes/daily.js
// All routes operate on a single "userId = 'default'" until auth is added.
//
// GET    /api/daily/:date                     → full day data (or default empty)
// PATCH  /api/daily/:date/stats               → partial stats update
// GET    /api/daily/history                   → list of dates that have data
//
// POST   /api/daily/:date/workouts            → add workout
// PATCH  /api/daily/:date/workouts/:id/toggle → toggle completed flag
// DELETE /api/daily/:date/workouts/:id        → remove workout
//
// POST   /api/daily/:date/meals               → add meal
// DELETE /api/daily/:date/meals/:id           → remove meal
// PUT    /api/daily/:date/meals               → replace entire meals array (+ recalc stats)

const express   = require('express');
const router    = express.Router({ mergeParams: true });
const { v4: uuidv4 } = require('uuid');
const DailyData = require('../models/DailyData');
const authMiddleware = require('../middleware/authMiddleware');

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Apply authMiddleware to all routes in this router
router.use(authMiddleware);

// ── Validation helpers ───────────────────────────────────────────────────────

function validateDate(date) {
  return DATE_RE.test(date);
}

const defaultStats = () => ({
  calories: 0, protein: 0, carbs: 0, fat: 0,
  water: 0, steps: 0, workoutCompleted: false, mood: 'neutral',
});

const defaultDay = () => ({ stats: defaultStats(), workouts: [], meals: [] });

/** Find or create the DailyData document for a given date */
async function getOrCreate(date, userId) {
  let doc = await DailyData.findOne({ userId, date });
  if (!doc) {
    doc = await DailyData.create({ userId, date, ...defaultDay() });
  }
  return doc;
}

/** Recalculate calorie/macro stats from a meals array */
function recalcMealStats(meals) {
  return meals.reduce(
    (acc, m) => ({
      calories: acc.calories + (m.calories || 0),
      protein:  acc.protein  + (m.protein  || 0),
      carbs:    acc.carbs    + (m.carbs    || 0),
      fat:      acc.fat      + (m.fat      || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
}

/** Shape the Mongoose doc into the DTO the Angular DataService expects */
function dayToDTO(doc) {
  return {
    stats:    doc.stats.toObject ? doc.stats.toObject() : doc.stats,
    workouts: doc.workouts,
    meals:    doc.meals,
  };
}

// ── GET /api/daily/history ───────────────────────────────────────────────────
// Must be declared BEFORE /:date routes to avoid "history" being matched as a date.
router.get('/history', async (req, res, next) => {
  try {
    const docs = await DailyData.find({ userId: req.user.userId }, 'date').lean();
    const dates = docs.map((d) => d.date).sort().reverse();
    res.json(dates);
  } catch (err) {
    next(err);
  }
});

// ── GET /api/daily/:date ─────────────────────────────────────────────────────
router.get('/:date', async (req, res, next) => {
  const { date } = req.params;
  if (!validateDate(date)) return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD.' });

  try {
    const doc = await DailyData.findOne({ userId: req.user.userId, date });
    res.json(doc ? dayToDTO(doc) : defaultDay());
  } catch (err) {
    next(err);
  }
});

// ── PATCH /api/daily/:date/stats ─────────────────────────────────────────────
// Accepts a partial DailyStats object — same as DataService.updateStats()
router.patch('/:date/stats', async (req, res, next) => {
  const { date } = req.params;
  if (!validateDate(date)) return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD.' });

  const allowed = ['calories', 'protein', 'carbs', 'fat', 'water', 'steps', 'workoutCompleted', 'mood'];
  const updates = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) {
      updates[`stats.${key}`] = req.body[key];
    }
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'No valid stats fields provided.' });
  }

  try {
    const doc = await DailyData.findOneAndUpdate(
      { userId: req.user.userId, date },
      { $set: updates },
      { new: true, upsert: true }
    );
    res.json(dayToDTO(doc));
  } catch (err) {
    next(err);
  }
});

// ── POST /api/daily/:date/workouts ───────────────────────────────────────────
// Body: { name, duration, calories, exercises[], completed }
router.post('/:date/workouts', async (req, res, next) => {
  const { date } = req.params;
  if (!validateDate(date)) return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD.' });

  const { name, duration = 30, calories = 150, exercises = [], completed = false } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Workout name is required.' });

  const workout = { id: uuidv4(), name: name.trim(), duration, calories, exercises, completed };

  try {
    const doc = await DailyData.findOneAndUpdate(
      { userId: req.user.userId, date },
      { $push: { workouts: workout } },
      { new: true, upsert: true }
    );
    res.status(201).json({ workout, day: dayToDTO(doc) });
  } catch (err) {
    next(err);
  }
});

// ── PATCH /api/daily/:date/workouts/:id/toggle ───────────────────────────────
// Toggles the `completed` flag — mirrors DataService.toggleWorkout()
router.patch('/:date/workouts/:id/toggle', async (req, res, next) => {
  const { date, id } = req.params;
  if (!validateDate(date)) return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD.' });

  try {
    const doc = await getOrCreate(date, req.user.userId);

    const workout = doc.workouts.find((w) => w.id === id);
    if (!workout) return res.status(404).json({ error: 'Workout not found.' });

    workout.completed = !workout.completed;
    await doc.save();

    res.json({ workout, day: dayToDTO(doc) });
  } catch (err) {
    next(err);
  }
});

// ── DELETE /api/daily/:date/workouts/:id ─────────────────────────────────────
router.delete('/:date/workouts/:id', async (req, res, next) => {
  const { date, id } = req.params;
  if (!validateDate(date)) return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD.' });

  try {
    const doc = await DailyData.findOneAndUpdate(
      { userId: req.user.userId, date },
      { $pull: { workouts: { id } } },
      { new: true }
    );
    if (!doc) return res.status(404).json({ error: 'Day data not found.' });
    res.json(dayToDTO(doc));
  } catch (err) {
    next(err);
  }
});

// ── POST /api/daily/:date/meals ──────────────────────────────────────────────
// Body: { name, calories, protein, carbs, fat }
router.post('/:date/meals', async (req, res, next) => {
  const { date } = req.params;
  if (!validateDate(date)) return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD.' });

  const { name, calories = 0, protein = 0, carbs = 0, fat = 0 } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Meal name is required.' });

  const meal = { id: uuidv4(), name: name.trim(), calories, protein, carbs, fat };

  try {
    const doc = await DailyData.findOneAndUpdate(
      { userId: req.user.userId, date },
      {
        $push: { meals: meal },
        // Incrementally update macro stats (mirrors DataService.addMeal)
        $inc: {
          'stats.calories': calories,
          'stats.protein':  protein,
          'stats.carbs':    carbs,
          'stats.fat':      fat,
        },
      },
      { new: true, upsert: true }
    );
    res.status(201).json({ meal, day: dayToDTO(doc) });
  } catch (err) {
    next(err);
  }
});

// ── DELETE /api/daily/:date/meals/:id ────────────────────────────────────────
router.delete('/:date/meals/:id', async (req, res, next) => {
  const { date, id } = req.params;
  if (!validateDate(date)) return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD.' });

  try {
    const doc = await getOrCreate(date, req.user.userId);

    const meal = doc.meals.find((m) => m.id === id);
    if (!meal) return res.status(404).json({ error: 'Meal not found.' });

    // Decrement stats first, then remove the meal
    doc.stats.calories = Math.max(0, doc.stats.calories - meal.calories);
    doc.stats.protein  = Math.max(0, doc.stats.protein  - meal.protein);
    doc.stats.carbs    = Math.max(0, doc.stats.carbs    - meal.carbs);
    doc.stats.fat      = Math.max(0, doc.stats.fat      - meal.fat);
    doc.meals = doc.meals.filter((m) => m.id !== id);

    await doc.save();
    res.json(dayToDTO(doc));
  } catch (err) {
    next(err);
  }
});

// ── PUT /api/daily/:date/meals ───────────────────────────────────────────────
// Replaces the entire meals array and recalculates stats.
// Mirrors DataService.updateMeals()
router.put('/:date/meals', async (req, res, next) => {
  const { date } = req.params;
  if (!validateDate(date)) return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD.' });

  const { meals } = req.body;
  if (!Array.isArray(meals)) return res.status(400).json({ error: '`meals` must be an array.' });

  // Ensure every meal has an id
  const normalised = meals.map((m) => ({
    id:       m.id || uuidv4(),
    name:     m.name || 'Unknown',
    calories: m.calories || 0,
    protein:  m.protein  || 0,
    carbs:    m.carbs    || 0,
    fat:      m.fat      || 0,
  }));

  const macros = recalcMealStats(normalised);

  try {
    const doc = await DailyData.findOneAndUpdate(
      { userId: req.user.userId, date },
      {
        $set: {
          meals:            normalised,
          'stats.calories': macros.calories,
          'stats.protein':  macros.protein,
          'stats.carbs':    macros.carbs,
          'stats.fat':      macros.fat,
        },
      },
      { new: true, upsert: true }
    );
    res.json(dayToDTO(doc));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
