const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema(
  {
    question: {
      type: String,
      required: true,
      trim: true,
    },
    answer: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    difficulty: {
      type: String,
      enum: ['easy', 'easy-medium', 'medium', 'medium-hard', 'hard'],
      required: true,
    },
    timesUsed: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true, // auto-manages createdAt + updatedAt
  }
);

module.exports = mongoose.model('Question', questionSchema);