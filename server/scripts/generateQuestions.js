require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Groq     = require('groq-sdk');
const fs       = require('fs');
const path     = require('path');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ── Schema (matches your existing model exactly) ─────────────────
const questionSchema = new mongoose.Schema(
  {
    question:   { type: String, required: true, trim: true },
    answer:     { type: String, required: true, trim: true },
    category:   { type: String, required: true, trim: true },
    difficulty: {
      type: String,
      enum: ['easy', 'easy-medium', 'medium', 'medium-hard', 'hard'],
      required: true,
    },
    timesUsed:  { type: Number, default: 0 },
  },
  { timestamps: true }
);

const Question = mongoose.models.Question || mongoose.model('Question', questionSchema);

// ── Category order (priority first) ─────────────────────────────
const ALL_CATEGORIES = [
  'Historical Figures',
  'Movies',
  'Brands',
  'Wars',
  'Food',
  'Video Games',
  'Technology',
  'Mythology',
  'Animals',
  'Human Body',
  'Sports',
  'Books and Novels',
  'Chemistry',
  'Law and Government',
  'Geography',
  'Countries',
  'Space',
  'Music',
  'Art',
  'Biology',
];

// ── Answer tier definitions ──────────────────────────────────────
// Counts: easy=30, easy-medium=10, medium=5, medium-hard=5, hard=5 → 55 total
// Questions target: 30 per difficulty level
const ANSWER_TIERS = [
  {
    tier: 'easy',
    count: 30,
    // Target: household names — a 5th grader (age 10-11) knows instantly with zero hints.
    // Think: answers you would see on a billboard, in a kids movie, or taught in 3rd grade.
    // BAD examples (too hard for easy): Leif Erikson, Sacagawea, Catherine the Great
    // GOOD examples: George Washington, Albert Einstein, Cleopatra
    description: 'Absolute household names only. A 5th grader (age 10-11) would know this instantly with zero hints. These are the most famous possible people/things in this category — the kind taught in early elementary school or seen in kids movies and advertising.',
    examples: {
      'Historical Figures': 'George Washington, Abraham Lincoln, Albert Einstein, Cleopatra, Napoleon Bonaparte, Neil Armstrong, Julius Caesar, Martin Luther King Jr., Christopher Columbus, Marco Polo, Joan of Arc, George Washington, Marie Curie, Leonardo da Vinci',
      'Movies':             'The Lion King, Titanic, Star Wars, Toy Story, Jurassic Park, Home Alone, The Avengers, Finding Nemo, Harry Potter, Spider-Man',
      'Brands':             'Nike, McDonalds, Apple, Coca-Cola, Google, Amazon, Disney, Toyota, Samsung, Walmart, Microsoft, YouTube',
      'Wars':               'World War II, World War I, American Civil War, Vietnam War',
      'Food':               'Pizza, Hamburger, Ice Cream, Chocolate, Sushi, Tacos, Pasta, Fried Chicken, Apple, Bread, Cheese, Bacon',
      'Video Games':        'Minecraft, Mario, Pac-Man, Tetris, Pokemon, Fortnite, Call of Duty, FIFA, Roblox, Sonic the Hedgehog',
      'Technology':         'iPhone, Television, Internet, Computer, Radio, Camera, Car, Telephone, Airplane, Calculator',
      'Mythology':          'Zeus, Thor, Hercules, Poseidon, Apollo, Medusa, Odin, Athena, Hades, Loki',
      'Animals':            'Lion, Elephant, Shark, Eagle, Tiger, Dolphin, Dog, Cat, Penguin, Giraffe, Monkey, Zebra',
      'Human Body':         'Heart, Brain, Lungs, Stomach, Eyes, Bones, Blood, Skin, Teeth, Ears, Nose, Hands',
      'Sports':             'Soccer, Basketball, Baseball, Tennis, Swimming, Golf, Football, Boxing, Olympics, Hockey',
      'Books and Novels':   'Harry Potter, The Bible, Romeo and Juliet, The Hobbit, Cinderella, Pinocchio, Robinson Crusoe',
      'Chemistry':          'Gold, Oxygen, Water, Iron, Carbon, Salt, Diamond, Silver',
      'Law and Government': 'President, Congress, Democracy, Constitution, Police, Judge, Election, Taxes, Senate, Military',
      'Geography':          'Amazon River, Mount Everest, Sahara Desert, Pacific Ocean, Grand Canyon, Niagara Falls, Eiffel Tower',
      'Countries':          'United States, China, France, Brazil, Australia, Japan, Russia, England, Canada, Germany',
      'Space':              'Moon, Sun, Mars, Earth, Stars, Milky Way, Astronaut, Rocket, Black Hole, Meteor',
      'Music':              'Beatles, Michael Jackson, Guitar, Piano, Mozart, Elvis Presley, Drums, Taylor Swift',
      'Art':                'Mona Lisa, Leonardo da Vinci, Picasso, Michelangelo, Van Gogh',
      'Biology':            'Photosynthesis, DNA, Cell, Evolution, Bacteria, Plant, Animal, Dinosaur',
    },
  },
  {
    tier: 'easy-medium',
    count: 10,
    // Target: famous enough that most adults know them, but not quite a household name for kids.
    // Think: Jeopardy! easy round, things covered in middle school, famous historical explorers/inventors.
    // BAD (too hard): Jan Hus, Enver Pasha, Sayyida al-Hurra — no average person knows these
    // BAD (too easy — belongs in easy): Genghis Khan, Galileo, Columbus — already very famous
    // GOOD: Leif Erikson, Nikola Tesla, Sitting Bull, Amelia Earhart, Blackbeard
    description: 'Famous and widely known, but one step below household name. Most adults would recognize these immediately. Think: famous explorers, inventors, or events that appear in middle school textbooks and popular history shows — not obscure, just not top-tier famous.',
    examples: {
      'Historical Figures': 'Leif Erikson, Nikola Tesla, Amelia Earhart, Blackbeard, Sitting Bull, Harriet Tubman, Pocahontas, King Tut, Ivan the Terrible, Genghis Khan',
      'Movies':             'Schindler\'s List, The Godfather, Forrest Gump, Braveheart, Gladiator, The Matrix, Goodfellas, Back to the Future',
      'Brands':             'Rolex, IKEA, Ferrari, Starbucks, Lego, Adidas, Sony, BMW, Porsche, Harley-Davidson',
      'Wars':               'The Crusades, Korean War, Gulf War, Napoleonic Wars, Revolutionary War, Spanish-American War',
      'Food':               'Croissant, Burrito, Falafel, Dim Sum, Ramen, Fish and Chips, Waffles, Churros, Gyro',
      'Video Games':        'The Legend of Zelda, Halo, Grand Theft Auto, The Sims, Street Fighter, Resident Evil, Donkey Kong',
      'Technology':         'Bluetooth, USB flash drive, GPS, 3D printing, Wi-Fi, Microwave oven, Lightbulb, Printing press',
      'Mythology':          'Achilles, Odysseus, Minotaur, Pandora, Ares, Cupid, Perseus, Cyclops, Centaur',
      'Animals':            'Platypus, Komodo Dragon, Cheetah, Giant Panda, Flamingo, Kangaroo, Cobra, Grizzly Bear',
      'Human Body':         'Skull, Spine, Kidney, Liver, Artery, Vein, Intestine, Ribcage, Bladder, Muscle',
      'Sports':             'Super Bowl, World Cup, Tour de France, Wimbledon, NBA Finals, Formula 1, Daytona 500',
      'Books and Novels':   'Don Quixote, Moby Dick, 1984, The Odyssey, Hamlet, Dracula, Frankenstein, Oliver Twist',
      'Chemistry':          'Carbon dioxide, Hydrogen, Nitrogen, Copper, Acid, Periodic Table, Aluminum, Helium',
      'Law and Government': 'Supreme Court, Electoral College, Amendment, Veto, Governor, Treaty, Jury, Impeachment',
      'Geography':          'Great Barrier Reef, Rocky Mountains, Mediterranean Sea, Himalayas, Mississippi River, Gobi Desert',
      'Countries':          'Egypt, Greece, Mexico, India, Italy, Saudi Arabia, Turkey, South Africa, Argentina',
      'Space':              'Saturn, Jupiter, Hubble Telescope, Big Bang, Comet, Asteroid, NASA, Solar System',
      'Music':              'Bob Dylan, Jazz, David Bowie, Rolling Stones, Hip Hop, Beethoven, Jimi Hendrix',
      'Art':                'Starry Night, Sistine Chapel, Impressionism, Rembrandt, Frida Kahlo, Monet, Raphael',
      'Biology':            'Mitosis, Virus, Mammal, Ecosystem, Genetics, Chromosome, Fossil, Natural selection',
    },
  },
  {
    tier: 'medium',
    count: 5,
    // Target: something a curious adult or high school graduate would know — not obscure, but requires real knowledge.
    // Think: Pub quiz medium round. You might not get it immediately but you recognize the name when you hear it.
    // BAD (too hard — belongs in medium-hard): Rani Rashmoni, Moses Montefiore, Tamerlane
    // BAD (too easy — belongs in easy-medium): Genghis Khan, Ivan the Terrible, Sitting Bull
    // GOOD: Saladin, Otto von Bismarck, Simón Bolívar, Confucius, Attila the Hun
    description: 'Requires genuine knowledge but still recognizable to a curious adult or high school graduate. These are names/events a history buff or good trivia player would know — you might not get it instantly but you recognize it when you hear it. NOT obscure specialists.',
    examples: {
      'Historical Figures': 'Saladin, Otto von Bismarck, Simón Bolívar, Confucius, Attila the Hun, Sun Tzu, Montezuma, Hannibal Barca, William the Conqueror',
      'Movies':             'Citizen Kane, Apocalypse Now, 2001: A Space Odyssey, Casablanca, Lawrence of Arabia, Psycho, The Seventh Seal',
      'Brands':             'Hermès, Levi\'s, Rolls-Royce, Ray-Ban, Montblanc, Tiffany and Co, Burberry',
      'Wars':               'Peloponnesian War, Hundred Years War, Crimean War, Boer War, Thirty Years War, Wars of the Roses',
      'Food':               'Kimchi, Paella, Goulash, Pho, Baklava, Prosciutto, Ceviche, Tagine',
      'Video Games':        'Final Fantasy VII, Half-Life, Doom, Castlevania, Metal Gear Solid, Baldurs Gate',
      'Technology':         'Morse code, Steam engine, Transistor, ARPANET, Gutenberg press, Analytical Engine',
      'Mythology':          'Sisyphus, Persephone, Anubis, Atlas, Orpheus, Romulus and Remus, Fenrir',
      'Animals':            'Axolotl, Pangolin, Narwhal, Capybara, Manta Ray, Okapi, Shoebill stork',
      'Human Body':         'Pancreas, Femur, Cornea, Cochlea, Cerebellum, Thyroid, Appendix, Trachea',
      'Sports':             'Lacrosse, Polo, Curling, Handball, Fencing, Rowing, Water polo',
      'Books and Novels':   'The Brothers Karamazov, The Scarlet Letter, Beowulf, Crime and Punishment, Les Miserables, Anna Karenina',
      'Chemistry':          'Covalent bond, Valence electron, Isotope, Enzyme, Catalyst, Proton, Neutron',
      'Law and Government': 'Habeas Corpus, Filibuster, Eminent Domain, Appellate Court, Martial Law, Magna Carta',
      'Geography':          'Atacama Desert, Bosphorus Strait, Hindu Kush, Patagonia, Strait of Magellan, Mekong River',
      'Countries':          'Mongolia, Ethiopia, Peru, Cambodia, Bolivia, Zimbabwe, Laos, Belarus',
      'Space':              'Neutron star, Solar flare, Dark matter, Kepler telescope, Supernova, Quasar',
      'Music':              'Beethoven\'s Fifth Symphony, John Coltrane, Theremin, Gregorian chant, Vivaldi, Handel',
      'Art':                'Baroque period, Caravaggio, Surrealism, Expressionism, Botticelli, Vermeer',
      'Biology':            'Meiosis, Endoplasmic reticulum, Nitrogen cycle, Osmosis, Cambrian explosion, Symbiosis',
    },
  },
  {
    tier: 'medium-hard',
    count: 5,
    // Target: a well-read adult with genuine interest in the subject would know this, but most people would not.
    // Think: pub quiz hard round, college history/science class. Still a REAL name/thing — not an obscure footnote.
    // BAD (way too obscure): Todor Kostić, Sayyida al-Hurra, Pero Tudebodus — these are footnotes
    // GOOD: Jan Hus, Khalid ibn al-Walid, Tamerlane, Leopold II, Rani Lakshmibai
    description: 'Known to well-read adults and enthusiasts with genuine interest in the subject — but most people would not recognize them. These are real, notable historical figures or concepts that appear in college-level courses or serious documentaries. NOT total obscurities.',
    examples: {
      'Historical Figures': 'Jan Hus, Khalid ibn al-Walid, Tamerlane, Leopold II of Belgium, Rani Lakshmibai, Vlad the Impaler, Charles Martel, Zenobia, Theodora of Byzantium',
      'Movies':             'Tokyo Story, The Battle of Algiers, Andrei Rublev, Aguirre the Wrath of God, Rashomon, M by Fritz Lang',
      'Brands':             'Patek Philippe, Pagani, A. Lange and Sohne, Benchmade knives, Rimowa luggage',
      'Wars':               'War of Jenkins\' Ear, Hussite Wars, Maratha Wars, Reconquista, Taiping Rebellion, Zulu War',
      'Food':               'Khachapuri, Mole negro, Injera, Jollof rice, Shawarma, Poutine, Bibimbap',
      'Video Games':        'Pathologic, EarthBound, Planescape Torment, System Shock, Deus Ex, Thief',
      'Technology':         'ENIAC, Jacquard loom, Difference Engine, Vacuum tube, Punch card, Ada Lovelace\'s algorithm',
      'Mythology':          'Ereshkigal, Morrigan, Anansi, Inanna, Quetzalcoatl, Set (Egyptian), Izanagi',
      'Animals':            'Saiga Antelope, Quetzal, Tarsier, Fossa, Binturong, Kakapo, Sun bear',
      'Human Body':         'Falx cerebri, Brunner\'s glands, Meissner\'s plexus, Glomerulus, Loop of Henle',
      'Sports':             'Korfball, Pesäpallo, Sepak takraw, Hurling, Gaelic football, Kabaddi',
      'Books and Novels':   'Tristram Shandy, Oblomov, Nana by Zola, The Master and Margarita, Buddenbrooks',
      'Chemistry':          'Le Chatelier\'s principle, Disproportionation, Electronegativity, Activation energy, Redox reaction',
      'Law and Government': 'Promissory estoppel, Bill of Attainder, Writ of mandamus, Star Chamber, Lex talionis',
      'Geography':          'Sudd wetlands, Tibesti Mountains, Caprivi Strip, Ferghana Valley, Rub al Khali desert',
      'Countries':          'Comoros, Nauru, Djibouti, Kiribati, San Marino, Liechtenstein, Andorra',
      'Space':              'Chandrasekhar limit, Magnetar, Sagittarius A*, Oort Cloud, Roche limit',
      'Music':              'Schoenberg twelve-tone technique, Maqam system, Sitar, Oud, Gamelan orchestra',
      'Art':                'Mannerism, Arte Povera, Pontormo, Suprematism, Hieronymus Bosch, Gustave Moreau',
      'Biology':            'Quorum sensing, Operon model, Niche partitioning, Allopatric speciation, Hardy-Weinberg',
    },
  },
  {
    tier: 'hard',
    count: 5,
    // Target: obscure enough that only genuine enthusiasts or specialists would know — but still a REAL,
    // standalone named person/thing. NEVER a descriptor like "Kublai Khan's governor" — must be a proper name.
    // BAD: "Kublai Khan's governor", "Nader Shah's general" — these are descriptions not answers
    // BAD: Todor Kostić, Pero Tudebodus — so obscure they're basically trivia footnotes with no Wikipedia depth
    // GOOD: Taharqa, Antiochus III, Phocas, Enver Pasha, Nur Jahan — real figures with real historical depth
    description: 'Genuinely obscure — only a history buff, academic, or dedicated enthusiast would know this. These must be real standalone named people, places, events, or concepts — never a descriptor or relationship (no "X\'s general" or "Y\'s wife"). Known to specialists but unlikely to appear on mainstream trivia.',
    examples: {
      'Historical Figures': 'Taharqa, Antiochus III, Enver Pasha, Nur Jahan, Phocas, Jan III Sobieski, Yermak Timofeyevich, Birger Jarl, Prithviraj Chauhan',
      'Movies':             'Sátántangó, Jeanne Dielman, Der müde Tod, Daisies (Sedmikrásky), Ivan the Terrible Part II, The Color of Pomegranates',
      'Brands':             'Jaeger-LeCoultre, Van Cleef and Arpels, Grenson shoes, Breguet watches, S.T. Dupont',
      'Wars':               'Diadochi Wars, War of the Eight Princes, Anarchy (England 1135-1153), Burmese-Siamese War 1547, Imjin War',
      'Food':               'Surströmming, Hákarl, Mirugai, Cuy, Lutefisk, Mursik, Balut',
      'Video Games':        'Baroque (1998 Sting), Takeshi\'s Challenge (1986), Planescape Torment, NetHack, Dwarf Fortress',
      'Technology':         'Antikythera mechanism, Williams tube memory, Colossus computer, Manchester Baby, Memristor',
      'Mythology':          'Apep, Enlil, Taranis, Nüwa, Tiamat, Mot (Canaanite), Ereshkigal',
      'Animals':            'Olm, Goblin shark, Yeti crab, Barreleye fish, Vampire squid, Irrawaddy dolphin',
      'Human Body':         'Crypts of Lieberkühn, Macula densa, Spiral ganglion, Lamina propria, Falx cerebri',
      'Sports':             'Ulama, Buzkashi, Calcio storico, Pato (Argentine sport), Knattleikr',
      'Books and Novels':   'Euphues by Lyly, The Unfortunate Traveller by Nashe, Oblomov, Petersburg by Bely, Champavert',
      'Chemistry':          'Baeyer-Villiger oxidation, Ylide, Cyclopentadienyl ligand, Ziegler-Natta catalyst, Diels-Alder reaction',
      'Law and Government': 'Praemunire, Allodial title, Droit de suite, Scutage, Mortmain statute',
      'Geography':          'Murghab River, Sistan Basin, Haud plateau, Zhongdian plateau, Caprivi Strip',
      'Countries':          'Tokelau, Sark, Bir Tawil, Akwesasne, Neutral Moresnet',
      'Space':              'Thorne-Zytkow object, Blandford-Znajek process, Balmer decrement, Shakura-Sunyaev model',
      'Music':              'Klangfarbenmelodie, Ligeti micropolyphony, Spectralism, Musique concrète, Guido d\'Arezzo',
      'Art':                'Intimism, Spatialism, Synchronism, Tachisme, Rayonism',
      'Biology':            'Syntrophism, Holobiont theory, Constructive neutral evolution, Meselson-Stahl experiment, Quorum sensing',
    },
  },
];

// ── Ladder: tier priority order per question difficulty ──────────
// Each array lists tiers from HIGHEST priority to LOWEST.
// Pool is built in this order so harder/rarer answers are used first,
// then filled down with easier tiers to reach the 30-question target.
//
//  easy        → easy only (30 answers, random subset)
//  easy-medium → easy-medium first (10), then fill with easy (up to 30)
//  medium      → medium first (5), then easy-medium (10), then easy (up to 30)
//  medium-hard → medium-hard first (5), medium (5), easy-medium (10), easy (up to 30)
//  hard        → hard first (5), medium-hard (5), medium (5), easy-medium (10), easy (up to 30)
const LADDER = {
  'easy':        ['easy'],
  'easy-medium': ['easy-medium', 'easy'],
  'medium':      ['medium', 'easy-medium', 'easy'],
  'medium-hard': ['medium-hard', 'medium', 'easy-medium', 'easy'],
  'hard':        ['hard', 'medium-hard', 'medium', 'easy-medium', 'easy'],
};

const TARGET_QUESTIONS_PER_DIFFICULTY = 30;

// ── Question difficulty prompting guidance ───────────────────────
const DIFFICULTY_GUIDANCE = {
  'easy': {
    label:    'Easy (5th grade, age ~10)',
    guidance: 'Extremely direct and obvious. Use simple everyday words. Anyone should get this almost immediately.',
    example:  '"What organ pumps blood through the human body?" → Heart',
  },
  'easy-medium': {
    label:    'Easy-Medium (7th grade, age ~12-13)',
    guidance: 'Requires some general knowledge. Slightly less direct than easy — needs a small amount of recall.',
    example:  '"What hard structure encases and protects the human brain?" → Skull',
  },
  'medium': {
    label:    'Medium (High school)',
    guidance: 'Requires genuine high school level knowledge. Specific enough to have one clear answer, but not immediately obvious.',
    example:  '"What gland located behind the stomach produces insulin to regulate blood sugar?" → Pancreas',
  },
  'medium-hard': {
    label:    'Medium-Hard (College/Undergraduate)',
    guidance: 'College-level question. Use some academic terminology. Indirect enough that only a knowledgeable adult would get it.',
    example:  '"What specialized renal cells at the juxtaglomerular apparatus sense tubular sodium to regulate filtration?" → Macula densa',
  },
  'hard': {
    label:    'Hard (PhD/Expert)',
    guidance: 'Highly obscure, academic phrasing. Very specific historical, scientific, or technical angle. Only a genuine expert would know this.',
    example:  '"What epithelial cells modulate renin secretion via tubuloglomerular feedback at the juxtaglomerular apparatus?" → Macula densa',
  },
};

// ── Paths ────────────────────────────────────────────────────────
const ANSWERS_DIR = path.join(__dirname, 'answers');
if (!fs.existsSync(ANSWERS_DIR)) fs.mkdirSync(ANSWERS_DIR, { recursive: true });

// ── Helpers ──────────────────────────────────────────────────────
function normalize(str) {
  return str.toLowerCase().trim().replace(/[^a-z0-9\s]/g, '');
}

function safeParseJSON(text) {
  let clean = text.replace(/```json|```/g, '').trim();
  clean = clean
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"');

  // Try straight parse first
  try { return JSON.parse(clean); } catch {}

  // Extract the first JSON array
  const arrMatch = clean.match(/\[[\s\S]*?\]/);
  if (arrMatch) {
    try { return JSON.parse(arrMatch[0]); } catch {}
  }

  // Extract the first JSON object
  const objMatch = clean.match(/\{[\s\S]*?\}/);
  if (objMatch) {
    try { return JSON.parse(objMatch[0]); } catch {}
  }

  // Last resort: pull out quoted strings from anywhere in the response
  const strings = [...clean.matchAll(/"([^"\\\n]{1,200})"/g)].map(m => m[1]).filter(Boolean);
  if (strings.length > 0) {
    console.log(`    ⚠️  JSON malformed — extracted ${strings.length} strings via fallback`);
    return strings;
  }

  throw new Error('Could not parse JSON:\n' + clean.substring(0, 300));
}

function getRetryDelay(msg) {
  const m = (msg.match(/(\d+)m/) || [])[1] || 0;
  const s = (msg.match(/(\d+(?:\.\d+)?)s/) || [])[1] || 0;
  return (parseInt(m) * 60 + parseFloat(s)) * 1000 + 5 * 60 * 1000;
}

async function waitWithCountdown(ms) {
  const total = Math.ceil(ms / 1000);
  console.log(`\n  ⏳ Rate limit — waiting ${Math.floor(total / 60)}m ${total % 60}s...`);
  let rem = total;
  while (rem > 0) {
    process.stdout.write(`\r  ⏱️  Resuming in ${Math.floor(rem / 60)}m ${rem % 60}s...   `);
    await new Promise(r => setTimeout(r, Math.min(30, rem) * 1000));
    rem -= 30;
  }
  console.log('\n  ✅ Resuming!\n');
}

async function withRetry(fn) {
  while (true) {
    try { return await fn(); }
    catch (err) {
      if (err.message?.includes('429')) await waitWithCountdown(getRetryDelay(err.message));
      else throw err;
    }
  }
}

function cacheFilePath(category) {
  return path.join(ANSWERS_DIR, `${category.replace(/[\s/]+/g, '_')}.json`);
}

function saveAnswerCache(category, tieredAnswers) {
  fs.writeFileSync(cacheFilePath(category), JSON.stringify(tieredAnswers, null, 2));
  console.log(`  💾 Saved → answers/${category.replace(/[\s/]+/g, '_')}.json`);
}

function loadAnswerCache(category) {
  const file = cacheFilePath(category);
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null;
}

// ── Step 1: Generate tiered answers ─────────────────────────────
async function generateTieredAnswers(category, existingAnswers = []) {
  const seen   = new Set(existingAnswers.map(normalize));
  const result = {};

  for (const tierDef of ANSWER_TIERS) {
    const { tier, count, description } = tierDef;
    const examples = tierDef.examples[category] || '';

    console.log(`\n  🎯 [${tier}] — generating ${count} answers for "${category}"...`);

    const collected = [];
    let attempts    = 0;

    while (collected.length < count && attempts < 10) {
      attempts++;
      const needed = count - collected.length;
      const avoid  = collected.length > 0
        ? `\nDo NOT repeat these already collected:\n${collected.map(a => `- ${a}`).join('\n')}\n`
        : '';

      const prompt =
`You are a trivia expert. Generate exactly ${needed} trivia answers for the category "${category}" at the "${tier}" difficulty tier.

Tier definition: ${description}
${examples ? `Correct examples for this tier in this category: ${examples}` : ''}
${avoid}
Rules:
- Must genuinely match the tier — not too easy, not too hard for this tier
- Must be real, factual, and clearly in the "${category}" category
- No duplicates
- Concise: 1–6 words, the name/title only — no descriptions
- Must be appropriate for the tier level as described above

Respond ONLY with a valid JSON array of strings, no markdown, no explanation:
["answer1", "answer2", ...]`;

      const res = await withRetry(() =>
        groq.chat.completions.create({
          model: 'meta-llama/llama-4-scout-17b-16e-instruct',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.85,
        })
      );

      let parsed;
      try {
        parsed = safeParseJSON(res.choices[0].message.content.trim());
      } catch (parseErr) {
        console.log(`    ⚠️  Bad JSON on attempt ${attempts} — skipping batch (${parseErr.message.split('\n')[0]})`);
        await new Promise(r => setTimeout(r, 400));
        continue;
      }

      let added = 0;
      for (const a of parsed) {
        const normA = normalize(String(a));
        if (normA && !seen.has(normA)) {
          seen.add(normA);
          collected.push(String(a).trim());
          added++;
        }
      }

      console.log(`    attempt ${attempts}: +${added} → [${collected.length}/${count}]`);
      await new Promise(r => setTimeout(r, 400));
    }

    if (collected.length < count) {
      console.log(`    ⚠️  Got ${collected.length}/${count} for [${tier}]`);
    }

    result[tier] = collected.slice(0, count);

    // Save progress after every tier so a crash mid-generation doesn't lose work
    saveAnswerCache(category, result);
  }

  return result;
}

// ── Step 2: Generate one question ───────────────────────────────
async function generateQuestion(answer, category, questionDiff) {
  const g = DIFFICULTY_GUIDANCE[questionDiff];

  const prompt =
`You are a trivia question writer. Write exactly ONE question where the correct answer is "${answer}" (category: "${category}").

Required difficulty: ${g.label}
Guidance: ${g.guidance}
Example at this level: ${g.example}

RULES:
1. Do NOT write "${answer}" or any obvious synonym/abbreviation of it in the question text.
2. Only ONE possible answer: "${answer}".
3. Clearly specify what type of answer is expected (Who / What / In what year / In what city / etc.).
4. Write the FULL question — never truncate with "..." or "…".
5. Under 150 characters.
6. Straight apostrophes only — no curly/smart quotes.
7. Not a yes/no question.

Respond ONLY with a valid JSON object, no markdown:
{ "question": "..." }`;

  const res = await withRetry(() =>
    groq.chat.completions.create({
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.75,
    })
  );

  const parsed = safeParseJSON(res.choices[0].message.content.trim());
  const q      = (parsed.question || '').trim();

  if (!q || q.endsWith('...') || q.endsWith('\u2026')) return null;
  return q;
}

// ── Step 3: Questions for all difficulties via ladder ────────────
async function generateQuestionsForCategory(category, tieredAnswers) {
  const QUESTION_DIFFICULTIES = ['easy', 'easy-medium', 'medium', 'medium-hard', 'hard'];
  const allDocs = [];

  for (const qDiff of QUESTION_DIFFICULTIES) {
    console.log(`\n  📝 Generating [${qDiff}] questions for "${category}"...`);

    // Build pool in tier-priority order (hardest first, fill down to easy).
    // Within each tier answers are shuffled individually so we don't always
    // pick the same subset — but the tier ordering is preserved so harder
    // answers are always consumed before falling back to easier ones.
    let pool = [];
    for (const tier of LADDER[qDiff]) {
      if (tieredAnswers[tier]) {
        const shuffledTier = [...tieredAnswers[tier]].sort(() => Math.random() - 0.5);
        pool = pool.concat(shuffledTier.map(a => ({ answer: a, answerTier: tier })));
      }
    }

    // Check what already exists in DB for this difficulty
    const existing = await Question.find(
      { category, difficulty: qDiff },
      { answer: 1, _id: 0 }
    ).lean();
    const doneSet = new Set(existing.map(d => normalize(d.answer)));

    const need    = TARGET_QUESTIONS_PER_DIFFICULTY - existing.length;
    const todo    = pool.filter(p => !doneSet.has(normalize(p.answer)));
    const selected = todo.slice(0, need);

    if (need <= 0) {
      console.log(`    ⏭️  Already at ${existing.length}/${TARGET_QUESTIONS_PER_DIFFICULTY} — skipping`);
      continue;
    }

    console.log(`    Pool: ${pool.length} | done: ${existing.length} | generating: ${selected.length}`);

    for (let i = 0; i < selected.length; i++) {
      const { answer, answerTier } = selected[i];
      try {
        const question = await generateQuestion(answer, category, qDiff);

        if (!question) {
          console.log(`    ⚠️  No valid question for "${answer}" @ ${qDiff}`);
          continue;
        }

        allDocs.push({ question, answer, category, difficulty: qDiff, timesUsed: 0 });
        console.log(`    ✓ [${i + 1}/${selected.length}] (${answerTier}) "${answer}" → "${question.substring(0, 60)}..."`);
        await new Promise(r => setTimeout(r, 350));

      } catch (err) {
        console.error(`    ✗ Error for "${answer}" @ ${qDiff}:`, err.message);
        await new Promise(r => setTimeout(r, 2000));
      }
    }
  }

  return allDocs;
}

// ── Review printer ───────────────────────────────────────────────
function printCategoryAnswers(category, tieredAnswers) {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`🔍 ANSWER REVIEW — ${category}`);
  console.log('─'.repeat(60));
  let total = 0;
  for (const { tier, count } of ANSWER_TIERS) {
    const answers = tieredAnswers[tier] || [];
    total += answers.length;
    console.log(`\n  [${tier}] ${answers.length}/${count}:`);
    answers.forEach((a, i) => console.log(`    ${String(i + 1).padStart(2, '0')}. ${a}`));
  }
  console.log(`\n  Total: ${total} answers`);
  console.log(`\n  📁 Edit if needed: answers/${category.replace(/[\s/]+/g, '_')}.json`);
  console.log(`  Then re-run — only missing questions will be generated.`);
  console.log('─'.repeat(60));
}

// ── Main ─────────────────────────────────────────────────────────
async function main() {
  // Usage:
  //   node generateQuestions.js "Historical Figures"   ← single category, pauses for review
  //   node generateQuestions.js                        ← all categories, no pause
  const targetCategory = process.argv[2]?.trim() || null;

  const categoriesToRun = targetCategory
    ? ALL_CATEGORIES.filter(c => c.toLowerCase() === targetCategory.toLowerCase())
    : ALL_CATEGORIES;

  if (targetCategory && categoriesToRun.length === 0) {
    console.error(`❌ Category "${targetCategory}" not found.\nAvailable:\n${ALL_CATEGORIES.map(c => `  - ${c}`).join('\n')}`);
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ MongoDB Connected\n');

  let totalSaved = 0;

  for (const category of categoriesToRun) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📂 Category: ${category}`);
    console.log('='.repeat(60));

    // Load or generate answer cache
    let tieredAnswers = loadAnswerCache(category);

    if (!tieredAnswers) {
      console.log(`  No cache found — generating tiered answers...`);
      const existingDocs    = await Question.find({ category }, { answer: 1, _id: 0 }).lean();
      const existingAnswers = [...new Set(existingDocs.map(d => d.answer))];
      tieredAnswers = await generateTieredAnswers(category, existingAnswers);
      saveAnswerCache(category, tieredAnswers);
    }

    // Always show answers for review
    printCategoryAnswers(category, tieredAnswers);

    // In single-category mode: pause for review/editing before generating
    if (targetCategory) {
      console.log('\n⏸️  Review the answers above.');
      console.log('   Edit the JSON file now if needed, then press ENTER to start generating questions.');
      console.log('   (Ctrl+C to cancel)\n');

      await new Promise(resolve => {
        const rl = require('readline').createInterface({ input: process.stdin, output: process.stdout });
        rl.question('Press ENTER when ready > ', () => { rl.close(); resolve(); });
      });

      // Reload cache in case user edited it
      tieredAnswers = loadAnswerCache(category);
      if (!tieredAnswers) {
        console.error('❌ Could not reload cache. Something went wrong.');
        continue;
      }
      console.log('\n  ♻️  Cache reloaded.\n');
    }

    // Generate questions
    const docs = await generateQuestionsForCategory(category, tieredAnswers);

    if (docs.length > 0) {
      await Question.insertMany(docs);
      totalSaved += docs.length;
      console.log(`\n  ✅ Saved ${docs.length} new questions for [${category}]`);
    } else {
      console.log(`\n  ℹ️  No new questions needed for [${category}]`);
    }

    const finalCount = await Question.countDocuments({ category });
    console.log(`  📊 [${category}] total in DB: ${finalCount} questions`);
  }

  console.log(`\n🎉 Done! Questions saved this run: ${totalSaved}`);
  mongoose.disconnect();
}

main().catch(err => {
  console.error('Fatal error:', err);
  mongoose.disconnect();
  process.exit(1);
});