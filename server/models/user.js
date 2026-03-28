const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  email: {
    type: String,
    required: false, // optional for guest-style play
    unique: true,
    sparse: true, // allows null/undefined without breaking unique
  },
  passwordHash: {
    type: String,
    required: false, // optional until auth is implemented
  },
  rank: {
    type: Number,
    default: 1000,
  },
  wins: {
    type: Number,
    default: 0,
  },
  losses: {
    type: Number,
    default: 0,
  },
  streak: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  lastLogin: Date,
});

module.exports = mongoose.model('User', userSchema);
