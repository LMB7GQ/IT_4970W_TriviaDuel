require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Groq     = require('groq-sdk');
const fs       = require('fs');
const path     = require('path');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ── Schema ──────────────────────────────────────────────────────
const Question = mongoose.model('Question', new mongoose.Schema({
  question:   { type: String, required: true },
  answer:     { type: String, required: true },
  category:   { type: String, required: true },
  difficulty: { type: String, required: true },
  timesUsed:  { type: Number, default: 0 },
  createdAt:  { type: Date,   default: Date.now },
}));

// ── Config ──────────────────────────────────────────────────────
const CATEGORIES = [
  'Historical Figures', 'Countries', 'Brands', 'Celebrities', 'Movies',
  'Video Games', 'Wars', 'Painters', 'Chemistry', 'Space',
  'Technology', 'Biology', 'Human Body', 'Art', 'Music',
  'Sports', 'Mythology', 'Animals', 'Math', 'Food',
  'Books and Novels',  'Law and Government', 
];

const DIFFICULTIES = [
  {
    level: 'easy',
    description: '5th grade level',
    guidance: 'Very obvious, basic fact a 10-year-old would know. Example: "Who was the first president of the United States?" → George Washington'
  },
  {
    level: 'easy-medium',
    description: '7th grade level',
    guidance: 'Slightly less obvious but still common knowledge for a 12-13 year old. Example: "Who invented the telephone?" → Alexander Graham Bell'
  },
  {
    level: 'medium',
    description: 'high school level',
    guidance: 'Requires genuine high school knowledge. Example: "Who wrote the 95 Theses that sparked the Protestant Reformation?" → Martin Luther'
  },
  {
    level: 'medium-hard',
    description: "bachelor's college level",
    guidance: "Requires college-level knowledge. Specific events, lesser-known facts. Example: \"Which Roman emperor issued the Edict of Milan?\" → Constantine"
  },
  {
    level: 'hard',
    description: 'PhD level',
    guidance: 'Obscure, highly specific, academic. Only experts would know. Example: "Which Byzantine emperor codified Roman law into the Corpus Juris Civilis?" → Justinian I'
  },
];

const ANSWERS_PER_CATEGORY = 50;
const ANSWERS_PER_BATCH    = 25; // 4 batches of 25 = 100 answers

// ── Answers directory ────────────────────────────────────────────
const ANSWERS_DIR = path.join(__dirname, 'answers');
if (!fs.existsSync(ANSWERS_DIR)) fs.mkdirSync(ANSWERS_DIR);

// ── Helpers ──────────────────────────────────────────────────────
function normalize(str) {
  return str.toLowerCase().trim().replace(/[^a-z0-9\s]/g, '');
}

function safeParseJSON(text) {
  let clean = text.replace(/```json|```/g, '').trim();
  clean = clean
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"');
  try {
    return JSON.parse(clean);
  } catch {
    const matchArr = clean.match(/\[[\s\S]*\]/);
    if (matchArr) return JSON.parse(matchArr[0]);
    const matchObj = clean.match(/\{[\s\S]*\}/);
    if (matchObj) return JSON.parse(matchObj[0]);
    throw new Error('Could not parse JSON from response');
  }
}

// ── Extract wait time from 429 error and add 5 min buffer ────────
function getRetryDelay(errorMessage) {
  const minMatch = errorMessage.match(/(\d+)m/);
  const secMatch = errorMessage.match(/(\d+(?:\.\d+)?)s/);
  const minutes  = minMatch ? parseInt(minMatch[1]) : 0;
  const seconds  = secMatch ? parseFloat(secMatch[1]) : 0;
  const totalMs  = (minutes * 60 + seconds) * 1000;
  const bufferMs = 5 * 60 * 1000;
  return totalMs + bufferMs;
}

// ── Countdown logger ─────────────────────────────────────────────
async function waitWithCountdown(ms) {
  const totalSeconds = Math.ceil(ms / 1000);
  const totalMins    = Math.floor(totalSeconds / 60);
  const totalSecs    = totalSeconds % 60;
  console.log(`\n  ⏳ Rate limit hit — waiting ${totalMins}m ${totalSecs}s before continuing...`);
  let remaining = totalSeconds;
  while (remaining > 0) {
    const mins = Math.floor(remaining / 60);
    const secs = remaining % 60;
    process.stdout.write(`\r  ⏱️  Resuming in ${mins}m ${secs}s...   `);
    const waitChunk = Math.min(30, remaining);
    await new Promise(res => setTimeout(res, waitChunk * 1000));
    remaining -= waitChunk;
  }
  console.log('\n  ✅ Resuming now!\n');
}

// ── Save / load answer list per category ─────────────────────────
function saveAnswerList(category, answers) {
  const file = path.join(ANSWERS_DIR, `${category.replace(/\s+/g, '_')}.json`);
  fs.writeFileSync(file, JSON.stringify(answers, null, 2));
  console.log(`  💾 Answer list saved → answers/${category.replace(/\s+/g, '_')}.json`);
}

function loadAnswerList(category) {
  const file = path.join(ANSWERS_DIR, `${category.replace(/\s+/g, '_')}.json`);
  if (fs.existsSync(file)) {
    const answers = JSON.parse(fs.readFileSync(file, 'utf8'));
    console.log(`  📂 Loaded ${answers.length} saved answers for [${category}]`);
    return answers;
  }
  return null;
}

// ── Step 1: Generate 100 unique answers for a category ───────────
async function generateAnswers(category, existingAnswers = []) {
  const allAnswers = [];
  const seen       = new Set(existingAnswers.map(normalize));

  console.log(`  🔑 Generating ${ANSWERS_PER_CATEGORY} unique answers for [${category}]...`);

  let attempts      = 0;
  const maxAttempts = 15;

  while (allAnswers.length < ANSWERS_PER_CATEGORY && attempts < maxAttempts) {
    attempts++;
    const needed    = ANSWERS_PER_CATEGORY - allAnswers.length;
    const batchSize = Math.min(ANSWERS_PER_BATCH, needed);

    const avoidList = allAnswers.length > 0
      ? `\nDo NOT include any of these — they are already collected:\n${allAnswers.map(a => `- ${a}`).join('\n')}\n`
      : '';

    const prompt = `You are a trivia expert. Generate exactly ${batchSize} unique trivia answers for the category "${category}".
${avoidList}
Rules:
- Each answer must be real and well-known within the category "${category}"
- Answers should range from very famous to more obscure to cover all difficulty levels
- Every answer must be completely unique — no repeats whatsoever
- Answers should be concise (1-5 words)
- Answers should be basic and try to avoid obscure proper nouns that only a few people would know
- No descriptions, just the answer itself
- You must return exactly ${batchSize} answers

Respond ONLY with a valid JSON array of strings, no markdown, no explanation:
["answer1", "answer2", ...]`;

    try {
      const response = await groq.chat.completions.create({
        model: 'meta-llama/llama-4-scout-17b-16e-instruct',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.9,
      });

      const parsed           = safeParseJSON(response.choices[0].message.content.trim());
      const beforeCount      = allAnswers.length;
      const duplicatesInBatch = [];

      for (const answer of parsed) {
        const normA = normalize(answer);
        if (seen.has(normA)) {
          duplicatesInBatch.push(answer);
        } else {
          seen.add(normA);
          allAnswers.push(answer);
        }
      }

      if (duplicatesInBatch.length > 0) {
        console.log(`    ⚠️  ${duplicatesInBatch.length} duplicate(s) caught: ${duplicatesInBatch.join(', ')}`);
      }

      const added = allAnswers.length - beforeCount;
      console.log(`    ✓ Batch ${attempts}: +${added} unique answers [${allAnswers.length}/${ANSWERS_PER_CATEGORY}]`);

    } catch (err) {
      if (err.message.includes('429')) {
        const delay = getRetryDelay(err.message);
        await waitWithCountdown(delay);
        attempts--; // don't count rate limit as a real attempt
      } else {
        console.error(`    ✗ Answer batch failed:`, err.message);
      }
    }

    await new Promise(res => setTimeout(res, 500));
  }

  if (allAnswers.length < ANSWERS_PER_CATEGORY) {
    console.log(`    ⚠️  Only generated ${allAnswers.length} unique answers after ${maxAttempts} attempts — continuing with what we have`);
  }

  return allAnswers.slice(0, ANSWERS_PER_CATEGORY);
}

// ── Step 2: Generate 5 difficulty questions for one answer ───────
async function generateQuestionsForAnswer(answer, category) {
  const prompt = `You are a trivia question writer. Given the answer "${answer}" in the category "${category}", write exactly 5 trivia questions — one per difficulty level — where the correct answer to every question is "${answer}".

Difficulty levels and examples:
1. easy (5th grade): Very obvious. "Who was the first president of the United States?" → George Washington
2. easy-medium (7th grade): Slightly less obvious. "Who invented the telephone?" → Alexander Graham Bell
3. medium (high school): Requires knowledge. "Who wrote the 95 Theses?" → Martin Luther
4. medium-hard (college): Specific detail. "Which Roman emperor issued the Edict of Milan?" → Constantine
5. hard (PhD): Obscure, academic. "Which Byzantine emperor codified the Corpus Juris Civilis?" → Justinian I

STRICT RULES — violating any of these means the question is invalid:

1. NEVER include the answer "${answer}" or any part of the answer name inside the question itself.
   BAD:  "In what country did Cleopatra rule as queen?" → answer is Cleopatra (name is IN the question)
   GOOD: "Who was the last active ruler of the Ptolemaic Kingdom of Egypt?" → Cleopatra

2. The question must be SPECIFIC enough that ONLY "${answer}" is correct — not a category of things.
   BAD:  "Who was the French emperor?" → many emperors existed
   GOOD: "Who was exiled to Saint Helena after his defeat at Waterloo?" → Napoleon

3. The question must be SPECIFIC enough that there is only ONE possible answer.
   BAD:  "Who won two Nobel Prizes?" → multiple people have done this
   GOOD: "Who was the first person to win Nobel Prizes in two different sciences, Physics and Chemistry?" → Marie Curie

4. The question must specify EXACTLY what type of answer is expected:
   - Person     → "Who..."
   - Year       → "In what YEAR..."
   - City       → "In what CITY..."
   - Country    → "In what COUNTRY..."
   - Name/Title → "What is the NAME of..." or "What is the TITLE of..."
   - Number     → "How many..." or "What NUMBER..."

5. Never truncate questions with "..." or "…" — write the full question completely.
6. Keep questions under 120 characters.
7. Use only straight apostrophes, never curly/smart quotes.
8. No yes/no questions.
9. Each question must approach "${answer}" from a COMPLETELY DIFFERENT angle.

Respond ONLY with a valid JSON array, no markdown, no explanation:
[
  { "difficulty": "easy",        "question": "..." },
  { "difficulty": "easy-medium", "question": "..." },
  { "difficulty": "medium",      "question": "..." },
  { "difficulty": "medium-hard", "question": "..." },
  { "difficulty": "hard",        "question": "..." }
]`;

  const response = await groq.chat.completions.create({
    model: 'meta-llama/llama-4-scout-17b-16e-instruct',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
  });

  const parsed = safeParseJSON(response.choices[0].message.content.trim());

  // Filter out truncated questions and any where the answer leaks into the question
  return parsed.filter(q => {
    const truncated = q.question.endsWith('...') || q.question.endsWith('\u2026');
    if (truncated) {
      console.log(`    ✂️  Truncated removed for "${answer}": ${q.question}`);
      return false;
    }

    const answerWords = normalize(answer).split(' ').filter(w => w.length > 3);
    const normQ       = normalize(q.question);
    const leaked      = answerWords.some(word => normQ.includes(word));
    if (leaked) {
      console.log(`    🚫 Answer leaked into question for "${answer}": ${q.question}`);
      return false;
    }

    return true;
  });
}

// ── Main ─────────────────────────────────────────────────────────
async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ MongoDB Connected\n');

  let totalSaved = 0;

  for (const category of CATEGORIES) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📂 Category: ${category}`);
    console.log('='.repeat(60));

    // ── Try to load saved answer list first ──────────────────────
    let answers = loadAnswerList(category);

    if (!answers) {
      // No saved list — check DB and generate fresh
      const existingDocs    = await Question.find({ category }, { answer: 1, _id: 0 }).lean();
      const existingAnswers = [...new Set(existingDocs.map(d => d.answer))];

      if (existingAnswers.length >= ANSWERS_PER_CATEGORY) {
        console.log(`⏭️  Skipping — already has ${existingAnswers.length} unique answers in DB`);
        continue;
      }

      answers = await generateAnswers(category, existingAnswers);
      saveAnswerList(category, answers);
      console.log(`  ✅ ${answers.length} unique answers generated and saved\n`);
    }

    // ── Check DB to find where we left off ───────────────────────
    const doneDocs    = await Question.find({ category }, { answer: 1, _id: 0 }).lean();
    const doneAnswers = new Set(doneDocs.map(d => normalize(d.answer)));
    const remaining   = answers.filter(a => !doneAnswers.has(normalize(a)));

    if (remaining.length === 0) {
      console.log(`⏭️  All ${answers.length} answers already have questions — skipping`);
      continue;
    }

    console.log(`  ▶️  ${answers.length - remaining.length}/${answers.length} already done, ${remaining.length} remaining\n`);

    // ── Generate questions for each remaining answer ─────────────
    for (let i = 0; i < remaining.length; i++) {
      const answer = remaining[i];

      try {
        const questions = await generateQuestionsForAnswer(answer, category);

        if (questions.length === 0) {
          console.log(`  ⚠️  No valid questions for "${answer}" — skipping`);
          continue;
        }

        const docs = questions.map(q => ({
          question:   q.question,
          answer,
          category,
          difficulty: q.difficulty,
          timesUsed:  0,
          createdAt:  new Date(),
        }));

        await Question.insertMany(docs);
        totalSaved += docs.length;

        console.log(`  ✓ [${i + 1}/${remaining.length}] "${answer}" — ${docs.length} questions saved`);

        await new Promise(res => setTimeout(res, 500));

      } catch (err) {
        if (err.message.includes('429')) {
          const delay = getRetryDelay(err.message);
          await waitWithCountdown(delay);
          i--; // retry this answer after waiting
        } else {
          console.error(`  ✗ Failed for "${answer}":`, err.message);
          await new Promise(res => setTimeout(res, 2000));
        }
      }
    }

    console.log(`\n  📊 [${category}] complete — ${totalSaved} total questions saved so far`);
  }

  console.log(`\n🎉 All done! Total questions saved: ${totalSaved}`);
  mongoose.disconnect();
}

main();