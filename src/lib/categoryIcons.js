// ─── Category icons ───────────────────────────────────────────────────────────
// Maps category names → emoji icons. Default categories from constants.js are
// matched explicitly. User-defined categories use fuzzy matching against
// keywords; if nothing matches, a neutral fallback is returned.
//
// All matching is case-insensitive and Unicode-friendly. Emoji-based icons
// are used (instead of SVG) because they:
//   • render at any size with no extra payload
//   • work in both light and dark themes
//   • need no per-icon styling decisions
// ─────────────────────────────────────────────────────────────────────────────

// Explicit map for the canonical default categories.
const EXPLICIT = {
  // Expense categories from DEF_LISTS.categories_expense
  'Hrana':            '🍞',
  'Prijevoz':         '🚗',
  'Režije':           '🏠',
  'Kredit':           '🏦',
  'Osiguranje':       '🛡️',
  'Porez':            '📋',
  'Visa premium':     '💎',
  'Zabava':           '🎬',
  'Pretplata':        '🔄',
  'Putovanja':        '✈️',
  'Oprema':           '🔧',
  'Radovi':           '🔨',
  'Usluge':           '💼',
  'Investicije':      '📈',
  'Ostali izdaci':    '💸',

  // Income categories from DEF_LISTS.categories_income
  'Plaća':            '💰',
  'Uplata':           '💵',
  'Ostali primici':   '💵',

  // Common fallback
  'Ostalo':           '📌',
};

// Fuzzy keyword match — runs only when EXPLICIT misses.
// Croatian + English keywords cover the most common user-defined categories.
const KEYWORDS = [
  { match: ['hran', 'food', 'jelo', 'rucak', 'ručak', 'večer', 'kava', 'coffee', 'restoran'], icon: '🍞' },
  { match: ['gori', 'benzin', 'fuel', 'gas', 'prijev', 'transport', 'auto', 'taxi', 'uber'], icon: '🚗' },
  { match: ['rezij', 'režij', 'struj', 'plin', 'voda', 'utility', 'electric'],                icon: '🏠' },
  { match: ['kredit', 'loan', 'rata kr', 'leasing'],                                          icon: '🏦' },
  { match: ['osigur', 'insur'],                                                               icon: '🛡️' },
  { match: ['porez', 'tax'],                                                                  icon: '📋' },
  { match: ['premium', 'platinum', 'visa', 'master'],                                         icon: '💎' },
  { match: ['zabav', 'kino', 'film', 'movie', 'igra', 'game', 'koncert', 'event'],            icon: '🎬' },
  { match: ['pretplat', 'subscript', 'netflix', 'spotify', 'youtube', 'apple', 'google'],     icon: '🔄' },
  { match: ['putov', 'travel', 'hotel', 'avion', 'flight', 'odmor', 'vacation'],              icon: '✈️' },
  { match: ['oprem', 'equip', 'alat', 'tool'],                                                icon: '🔧' },
  { match: ['radov', 'work', 'gradnj', 'construct', 'majstor', 'popravak', 'repair'],         icon: '🔨' },
  { match: ['uslug', 'service', 'pretplat'],                                                  icon: '💼' },
  { match: ['invest', 'akcij', 'stock', 'fond', 'fund', 'dionic'],                            icon: '📈' },
  { match: ['plaća', 'placa', 'salary', 'wage'],                                              icon: '💰' },
  { match: ['uplat', 'deposit', 'transfer'],                                                  icon: '💵' },
  { match: ['zdrav', 'health', 'liječ', 'lijek', 'doctor', 'med', 'apoteka', 'pharmacy'],     icon: '🏥' },
  { match: ['škol', 'skol', 'school', 'edukac', 'tečaj', 'course', 'knjig', 'book'],          icon: '📚' },
  { match: ['djec', 'dijet', 'child', 'kid', 'baby'],                                         icon: '👶' },
  { match: ['kuća', 'kuca', 'home', 'stan', 'apartment'],                                     icon: '🏠' },
  { match: ['odjeć', 'odjec', 'cloth', 'shoes', 'fashion'],                                   icon: '👕' },
  { match: ['poklon', 'gift', 'donac', 'donation'],                                           icon: '🎁' },
  { match: ['ljubim', 'pet', 'pas', 'mačk', 'mack'],                                          icon: '🐾' },
  { match: ['sport', 'gym', 'teretan'],                                                       icon: '💪' },
  { match: ['frizer', 'kozmet', 'beauty', 'salon'],                                           icon: '💇' },
];

// Fallback for any category that doesn't match.
const FALLBACK = '📌';

/**
 * Returns an emoji icon for the given category name.
 * @param {string} name — category name (any language)
 * @returns {string} single emoji string
 */
export function categoryIcon(name) {
  if (!name) return FALLBACK;
  if (EXPLICIT[name]) return EXPLICIT[name];

  const lower = name.toLowerCase();
  for (const { match, icon } of KEYWORDS) {
    for (const k of match) {
      if (lower.includes(k)) return icon;
    }
  }
  return FALLBACK;
}

/**
 * Convenience for components — returns inline-renderable string.
 * Equivalent to categoryIcon but exists as a clear semantic alias.
 */
export const iconFor = categoryIcon;
