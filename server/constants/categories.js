/**
 * Master list of all available question categories.
 * Used for match generation and frontend display.
 * No DB fetch needed — update this list as categories are added to the DB.
 */
const CATEGORIES = [
  'Historical Figures', 'Countries', 'Brands', 'Celebrities', 'Movies',
  'Video Games', 'Wars', 'Painters', 'Chemistry', 'Space',
  'Technology', 'Biology', 'Human Body'
];

module.exports = CATEGORIES;