const express = require('express');
const router  = express.Router();
const {
  getCategories,
  getRandomQuestion,
  checkAnswer,
} = require('../controllers/questionController');

// GET  /api/questions/categories             → static category list
// GET  /api/questions/random?rank=&category= → 1 rank-matched question (solo free play)
// POST /api/questions/:id/check              → submit answer, returns { correct, correctAnswer }

router.get('/categories', getCategories);
router.get('/random', getRandomQuestion);
router.post('/:id/check', checkAnswer);

module.exports = router;