// Load order for Second Sight Pawn's original data and rules, exactly as its index.html had them.
// These files are copied into shared/ unchanged and run as classic scripts.
export const SSP_FILES = [
  'config', 'items', 'lab', 'bestiary', 'city', 'zones', 'market', 'story', 'endings', 'endless', 'tutorial', 'sound', 'cases',
].map(f => `shared/${f}.js`).concat([
  'core', 'items', 'lab', 'shop', 'maps', 'crawl', 'combat', 'city', 'calendar', 'story', 'audit', 'endless', 'recap', 'cases', 'state', 'sound', 'icons-pixel',
].map(f => `shared/js/${f}.js`), ['src/rules/bridge.classic.js']);
