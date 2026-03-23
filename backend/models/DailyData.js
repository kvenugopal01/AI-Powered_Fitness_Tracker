//   { daily: { "YYYY-MM-DD": { stats, workouts, meals } }, profile }
const mongoose = require('mongoose');

// ── Sub-schemas ──────────────────────────────────────────────────────────────

// Mirrors: interface DailyStats
const DailyStatsSchema = new mongoose.Schema(
  {
    calories: { type: Number, default: 0, min: 0 },
    protein:  { type: Number, default: 0, min: 0 },
    carbs:    { type: Number, default: 0, min: 0 },
    fat:      { type: Number, default: 0, min: 0 },
    water:    { type: Number, default: 0, min: 0 }, // ml
    steps:    { type: Number, default: 0, min: 0 },
    workoutCompleted: { type: Boolean, default: false },
    mood:     { type: String, default: 'neutral', trim: true },
  },
  { _id: false }
);

// Mirrors: interface Workout
const WorkoutSchema = new mongoose.Schema(
  {
    id:        { type: String, required: true },
    name:      { type: String, required: true, trim: true },
    duration:  { type: Number, default: 30, min: 0 }, // minutes
    calories:  { type: Number, default: 150, min: 0 },
    exercises: { type: [String], default: [] },
    completed: { type: Boolean, default: false },
  },
  { _id: false }
);

// Mirrors: interface Meal
const MealSchema = new mongoose.Schema(
  {
    id:       { type: String, required: true },
    name:     { type: String, required: true, trim: true },
    calories: { type: Number, default: 0, min: 0 },
    protein:  { type: Number, default: 0, min: 0 },
    carbs:    { type: Number, default: 0, min: 0 },
    fat:      { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

// ── Root document ────────────────────────────────────────────────────────────
// One document per day per user.
const DailyDataSchema = new mongoose.Schema(
  {
    userId: { type: String, default: 'default', index: true },
    date:   {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/, // enforces YYYY-MM-DD
      index: true,
    },
    stats:    { type: DailyStatsSchema, default: () => ({}) },
    workouts: { type: [WorkoutSchema],  default: [] },
    meals:    { type: [MealSchema],     default: [] },
  },
  { timestamps: true }
);

// Compound unique index — one record per user per day
DailyDataSchema.index({ userId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('DailyData', DailyDataSchema);
