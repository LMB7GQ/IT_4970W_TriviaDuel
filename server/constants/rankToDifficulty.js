/**
 * Maps a numeric rank (0–3000) to a difficulty string.
 *
 * Brackets:
 *   0    – 399  → easy
 *   400  – 799  → easy-medium
 *   800  – 1399 → medium
 *   1400 – 1999 → medium-hard
 *   2000 – 3000 → hard
 */
const rankToDifficulty = (rank) => {
  const r = Number(rank);

  if (isNaN(r)) return 'easy'; // safe default

  if (r < 400)  return 'easy';
  if (r < 800)  return 'easy-medium';
  if (r < 1400) return 'medium';
  if (r < 2000) return 'medium-hard';
  return 'hard';
};

module.exports = rankToDifficulty;