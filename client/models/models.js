const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },

  email: {
    type: String,
    required: true,
    unique: true
  },

  passwordHash: {
    type: String,
    required: true
  },

  rank: {
    type: Number,
    default: 1000
  },

  wins: {
    type: Number,
    default: 0
  },

  losses: {
    type: Number,
    default: 0
  },

  streak: {
    type: Number,
    default: 0
  },

  createdAt: {
    type: Date,
    default: Date.now
  },

  lastLogin: Date
});


const QuestionSchema = new mongoose.Schema({
  questionText: {
    type: String,
    required: true
  },

  options: {
    type: [String],
    required: true
  },

  correctAnswer: {
    type: String,
    required: true
  },

  category: {
    type: String,
    required: true
  },

  difficulty: {
    type: Number,
    required: true
  },

  usageCount: {
    type: Number,
    default: 0
  },

  createdByLLM: {
    type: Boolean,
    default: true
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
});

const MatchSchema = new mongoose.Schema({
  matchId: {
    type: String,
    required: true
  },

  players: [
    {
      userId: String,
      username: String,
      score: {
        type: Number,
        default: 0
      },

      answers: [
        {
          questionId: String,
          selectedAnswer: String,
          correct: Boolean
        }
      ]
    }
  ],

  categoriesUsed: [String],

  winnerId: String,

  status: {
    type: String,
    enum: ["waiting", "active", "finished", "abandoned"],
    default: "waiting"
  },

  startedAt: Date,

  endedAt: Date
});


const QuestionUsageSchema = new mongoose.Schema({
  questionId: String,

  matchId: String,

  usedAt: {
    type: Date,
    default: Date.now
  }
});


const CategorySchema = new mongoose.Schema({
  name: {
    type: String,
    unique: true
  },

  description: String
});



const LeaderboardSchema = new mongoose.Schema({
  username: String,

  rank: Number,

  wins: Number,

  losses: Number,

  updatedAt: {
    type: Date,
    default: Date.now
  }
});



module.exports = {
  User: mongoose.model("User", UserSchema),
  Question: mongoose.model("Question", QuestionSchema),
  Match: mongoose.model("Match", MatchSchema),
  QuestionUsage: mongoose.model("QuestionUsage", QuestionUsageSchema),
  Category: mongoose.model("Category", CategorySchema),
  Leaderboard: mongoose.model("Leaderboard", LeaderboardSchema)
};