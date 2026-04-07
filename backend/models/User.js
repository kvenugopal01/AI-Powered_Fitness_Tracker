const mongoose = require('mongoose');

const UserProfileSchema = new mongoose.Schema(
  {
    // googleId from Google OAuth
    googleId: {
      type: String,
      unique: true,
      sparse: true, // Only for users who logged in with Google
      index: true,
    },

    // ── Email/Password ──────────────────────────────────────────────
    password: {
      type: String, // Will be hashed
      select: false, // Don't return password by default
    },

    // ── Identity ──────────────────────────────────────────────
    email: {
      type: String,
      unique: true,
      required: true,
      trim: true,
      lowercase: true,
    },
    name: { type: String, default: 'New User', trim: true },
    picture: { type: String, trim: true },
    age: { type: Number, default: 28, min: 1, max: 120 },
    height: { type: Number, default: 180 }, // cm
    weight: { type: Number, default: 78 },  // kg
    gender: { type: String, default: 'Prefer not to say', trim: true },

    // ── Goals ─────────────────────────────────────────────────
    goals: { type: String, default: 'Improve overall fitness', trim: true },
    activityLevel: { type: String, default: 'Moderate', trim: true },

    // ── Daily targets ─────────────────────────────────────────
    calorieGoal: { type: Number, default: 2000, min: 0 },
    proteinGoal: { type: Number, default: 120, min: 0 },  // g
    waterGoal: { type: Number, default: 2500, min: 0 },   // ml
    stepGoal: { type: Number, default: 8000, min: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', UserProfileSchema);
