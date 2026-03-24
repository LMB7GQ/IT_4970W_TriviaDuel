const Question         = require('../models/question');
const rankToDifficulty = require('../constants/rankToDifficulty');
const CATEGORIES       = require('../constants/categories');

const normalize = (str) =>
  str.toLowerCase().trim().replace(/[^a-z0-9\s]/g, '');

// ── GET /api/questions/categories ───────────────────────────────
const getCategories = (req, res) => {
  res.json({ categories: CATEGORIES });
};

// ── GET /api/questions/random?rank=650&category=History ─────────
// Solo free play only — answer withheld, checked via POST /:id/check
const getRandomQuestion = async (req, res) => {
  try {
    const { rank = 500, category } = req.query;
    const difficulty = rankToDifficulty(rank);

    const filter = { difficulty };
    if (category) filter.category = category;

    // Pull 20 least-used matching questions then pick one randomly.
    // Compound index on { category, difficulty, timesUsed } makes this fast.
    const pool = await Question.find(filter)
      .sort({ timesUsed: 1 })
      .limit(20)
      .select('-answer'); // never send answer to client

    if (pool.length === 0) {
      return res.status(404).json({ error: 'No questions found for this rank/category' });
    }

    const question = pool[Math.floor(Math.random() * pool.length)];
    await Question.findByIdAndUpdate(question._id, { $inc: { timesUsed: 1 } });

    res.json({
      _id:        question._id,
      question:   question.question,
      category:   question.category,
      difficulty: question.difficulty,
    });
  } catch (err) {
    console.error('getRandomQuestion error:', err);
    res.status(500).json({ error: 'Failed to fetch question' });
  }
};

// ── POST /api/questions/:id/check ───────────────────────────────
// Only place correctAnswer is ever sent to the client
const checkAnswer = async (req, res) => {
  try {
    const { userAnswer } = req.body;
    if (!userAnswer) {
      return res.status(400).json({ error: 'userAnswer is required' });
    }

    const question = await Question.findById(req.params.id);
    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    const correct = normalize(userAnswer) === normalize(question.answer);
    res.json({ correct, correctAnswer: question.answer });
  } catch (err) {
    console.error('checkAnswer error:', err);
    res.status(500).json({ error: 'Failed to check answer' });
  }
};

module.exports = { getCategories, getRandomQuestion, checkAnswer };