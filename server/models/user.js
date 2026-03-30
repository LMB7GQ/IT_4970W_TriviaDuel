const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    username: {
      type:     String,
      required: true,
      unique:   true,
      trim:     true,
      lowercase: true,
    },
    passwordHash: {
      type:     String,
      required: true,
    },
    rank: {
      type:    Number,
      default: 1000,
    },
    wins: {
      type:    Number,
      default: 0,
    },
    losses: {
      type:    Number,
      default: 0,
    },
    streak: {
      type:    Number,
      default: 0,
    },
    lastLogin: {
      type: Date,
    },
  },
  {
    timestamps: true, // createdAt + updatedAt
  }
);

// ── Instance method: check password ─────────────────────────────
// Usage: const isMatch = await user.comparePassword(plainText)
userSchema.methods.comparePassword = async function (plainText) {
  return bcrypt.compare(plainText, this.passwordHash);
};

module.exports = mongoose.model('User', userSchema);



