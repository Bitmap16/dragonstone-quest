// Utility functions
function cssClassFor(name) {
  // Map party member names to HP bar CSS class
  if (name === "You") return "hp-user";
  if (name === "Nyx") return "hp-nyx";
  if (name === "Kael") return "hp-kael";
  // For new characters, generate pastel color and inject CSS rule
  if (!state.partyColors[name]) {
    state.partyColors[name] = pastel(name);
  }
  const cls = `hp-${name.toLowerCase().replace(/\W+/g, '-')}`;
  if (!document.getElementById(cls)) {
    const styleEl = document.createElement("style");
    styleEl.id = cls;
    styleEl.textContent = `
      .${cls} .health-bar::before {
        background: ${state.partyColors[name]};
      }
    `;
    document.head.appendChild(styleEl);
  }
  return cls;
}

const pastel = s => {
  let h = 0;
  for (const c of s) {
    h = (h + c.charCodeAt(0) * 31) % 360;
  }
  return `hsl(${h} 70% 85%)`;
};

const expSrc = (sp, emo = "neutral") =>
  `assets/expressions/${sp.toLowerCase()}/${emo}.png`;

/**
 * Convert a setting or mood name to a URL-friendly slug
 * @param {string} m - The input string to convert
 * @returns {string} URL-friendly slug
 */
const moodSlug = m => {
  if (!m) return 'default';
  return m
    .toLowerCase()
    .replace(/[^a-z0-9\-\s]+/g, '') // Remove special chars except hyphens and spaces
    .trim()
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with a single one
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
};

/**
 * Safely parse JSON with fallback handling for AI responses
 * @param {string} jsonString - The JSON string to parse
 * @param {any} fallback - Fallback value if parsing fails
 * @returns {any} Parsed JSON or fallback value
 */
function safeParseJSON(jsonString, fallback = null) {
  try {
    // First try to parse as-is
    return JSON.parse(jsonString);
  } catch (e) {
    try {
      // If that fails, try to extract JSON from markdown code blocks
      const jsonMatch = jsonString.match(/```(?:json)?\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1]);
      }
      
      // If no code blocks, try to find an array pattern
      const arrayMatch = jsonString.match(/\[\s*("[^"]*"(?:\s*,\s*"[^"]*")*)?\s*\]/);
      if (arrayMatch) {
        return JSON.parse(arrayMatch[0]);
      }
      
      // If all else fails, return fallback
      console.warn('Could not parse JSON, using fallback value');
      return fallback;
    } catch (innerError) {
      console.warn('Failed to parse JSON with fallback, using fallback value');
      return fallback;
    }
  }
}

// Expose utility functions globally
window.safeParseJSON = safeParseJSON;
window.cssClassFor = cssClassFor;
window.pastel = pastel;
window.expSrc = expSrc;
window.moodSlug = moodSlug;
