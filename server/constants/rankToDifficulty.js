/**
 * Maps a numeric rank (0–3000) to a difficulty string.
 *
 * Brackets:
 *   0    – 399  → easy
 *   400  – 799  → easy-medium
 *   800  – 1399 → medium
 *   1400 – 1999 → medium-hard
 *   2000 – 3000 → hard
 * updated 4-16 by Ian
 */
const rankToDifficulty = (rank) => {
  const r = Number(rank);

  if (isNaN(r)) return 'easy'; // safe default

  if (r < 4000)  return 'easy';
  if (r < 8000)  return 'easy-medium';
  if (r < 12000) return 'medium';
  if (r < 16000) return 'medium-hard';
  return 'hard';
};

module.exports = rankToDifficulty;
