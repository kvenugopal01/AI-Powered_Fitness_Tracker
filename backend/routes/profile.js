// routes/profile.js
// GET  /api/profile        → return the user's profile
// PUT  /api/profile        → update / upsert the user's profile
const express = require('express');
const router  = express.Router();
const User    = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware');

// GET /api/profile
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(profileToDTO(user));
  } catch (err) {
    next(err);
  }
});

// PUT /api/profile
router.put('/', authMiddleware, async (req, res, next) => {
  try {
    const updates = sanitizeProfileInput(req.body);
    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { $set: updates },
      { new: true, runValidators: true }
    );
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(profileToDTO(user));
  } catch (err) {
    next(err);
  }
});

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Shape the Mongoose doc into the exact object the Angular DataService expects */
function profileToDTO(user) {
  return {
    name:          user.name,
    age:           user.age,
    height:        user.height,
    weight:        user.weight,
    goals:         user.goals,
    gender:        user.gender,
    activityLevel: user.activityLevel,
    calorieGoal:   user.calorieGoal,
    proteinGoal:   user.proteinGoal,
    waterGoal:     user.waterGoal,
    stepGoal:      user.stepGoal,
  };
}

/** Whitelist allowed update fields */
function sanitizeProfileInput(body) {
  const allowed = [
    'name', 'age', 'height', 'weight', 'goals',
    'gender', 'activityLevel',
    'calorieGoal', 'proteinGoal', 'waterGoal', 'stepGoal',
  ];
  return allowed.reduce((acc, key) => {
    if (body[key] !== undefined) acc[key] = body[key];
    return acc;
  }, {});
}

module.exports = router;
