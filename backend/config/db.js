// config/db.js — MongoDB connection via Mongoose
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      // Mongoose 8+ has these defaults, but being explicit is safer
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log(`✅  MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌  MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
};

// Graceful disconnect helper (used during shutdown)
const disconnectDB = async () => {
  await mongoose.connection.close();
  console.log('🔌  MongoDB disconnected');
};

module.exports = { connectDB, disconnectDB };
