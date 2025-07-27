// settingAI.js - Handles scene/setting management based on story context
// Uses a sliding window of past settings and dialogue to determine appropriate scene changes

import { askAI } from './storyAI.js';


// This will be populated with available settings when the module loads
let AVAILABLE_SETTINGS = [];
let AVAILABLE_MOODS = [];

// Load available settings and moods
async function loadAvailableOptions() {
  try {
    // Get settings from settings module
    if (window.settings) {
      AVAILABLE_SETTINGS = await window.settings.getAvailableSettings();
      console.log('[settingAI] Loaded settings:', AVAILABLE_SETTINGS);
    }
    
    // Get moods from audio module if available
    if (window.audio) {
      await window.audio.loadMusicManifest();
      AVAILABLE_MOODS = Object.keys(MUSIC_MANIFEST || {});
      console.log('[settingAI] Loaded moods:', AVAILABLE_MOODS);
    }
  } catch (error) {
    console.error('[settingAI] Failed to load available options:', error);
  }
}

// Initialize when the module loads
loadAvailableOptions().catch(console.error);

function getSettingPrompt() {
  return `You are the Setting AI for a text-only fantasy RPG.
Your task is to select both the background *setting* and *mood* for the upcoming scene.

Return ONLY valid JSON (no markdown, no comments):
{
  "setting": "<location>",
  "mood": "<mood-directory>"
}

Example:

{
  "setting": "autumn_glade",
  "mood": "narrative/foreboding"
}

Available Settings (choose exactly one of these for "setting"; use hyphens for multi-word settings like 'adventure-begins'):
${AVAILABLE_SETTINGS.map(s => `- ${s}`).join('\n')}

Available Moods (choose exactly one of these for "mood"):
${AVAILABLE_MOODS.map(m => `- ${m}`).join('\n')}

Guidelines:
1. The setting must be one of the available settings listed above.
2. The mood must be one of the available moods listed above.
3. The mood should match the emotional tone of the scene.
4. Base your choices on the narrative context and any provided dialogue.
5. Keep output to a single line of JSON.`;
}

/**
 * Determine the next setting background and mood.
 * @param {Object} opts
 * @param {string[]} opts.availableSettings - Allowed setting values
 * @param {string}   opts.pastSettings      - Recent settings (string)
 * @param {string}   opts.pastDialogue      - Recent dialogue (string)
 * @returns {Promise<Object|null>} object with setting and mood or null on failure
 * @param {string}   opts.pastSettings - Recent settings (string)
 * @param {string}   opts.pastDialogue - Recent dialogue (string)
 * @returns {Promise<Object|null>} object with setting and mood or null on failure
 */
/**
 * Determine the next setting background and mood.
 * @param {Object} opts
 * @param {string}   opts.pastSettings - Recent settings (string)
 * @param {string}   opts.pastDialogue - Recent dialogue (string)
 * @returns {Promise<Object|null>} object with setting and mood or null on failure
 */
// Determine the most appropriate setting and mood based on context
async function determineSetting(params, attempt = 0) {
  // Destructure with defaults
  const {
    availableSettings = [],
    availableMoods = [],
    pastSettings = [],
    pastDialogue = ""
  } = params || {};
  try {
    // Ensure we have the latest settings and moods
    await loadAvailableOptions();
    
    // If we don't have any settings yet, log a warning but continue
    if (AVAILABLE_SETTINGS.length === 0) {
      console.warn('[settingAI] No settings available in manifest');
    }
    
    // If we don't have any moods yet, log a warning but continue
    if (AVAILABLE_MOODS.length === 0) {
      console.warn('[settingAI] No moods available in manifest');
    }
    
    const messages = [
      { role: 'system', content: getSettingPrompt() },
      { role: 'user', content: `Context for setting and mood selection:

Past settings (most recent last):
${pastSettings}

Recent dialogue:
${pastDialogue}` }
    ];

    const raw = await askAI(messages, { model: CONFIG.SETTING_MODEL });
    const cleaned = raw.replace(/```(?:json)?\s*([\s\S]*?)```/i, "$1").trim();
    const result = JSON.parse(cleaned);
    
    if (!result?.setting || !result?.mood) {
      throw new Error('Invalid response format: missing setting or mood field');
    }
    
    // Validate that the returned setting and mood are in our available lists
    // Force lowercase to prevent errors with AI capitalization
    if (result.setting) {
        result.setting = result.setting.toLowerCase();
        const isValidSetting = AVAILABLE_SETTINGS.some(s => s.toLowerCase() === result.setting);
        console.log(`[settingAI] Setting is valid:`, isValidSetting);
        if (!isValidSetting) {
            console.warn(`[settingAI] Invalid setting returned: '${result.setting}'. Current background will be kept.`);
            result.setting = null; // Set to null to indicate no change
        }
    }

    if (result.mood) {
        result.mood = result.mood.toLowerCase();
        const isValidMood = AVAILABLE_MOODS.some(m => m.toLowerCase() === result.mood);
        console.log(`[settingAI] Mood is valid:`, isValidMood);
        if (!isValidMood) {
            console.warn(`[settingAI] Invalid mood returned: '${result.mood}'. Falling back to 'narrative/foreboding'.`);
            result.mood = 'narrative/foreboding';
        }
    }
    
    console.log(`%c[settingAI] %c${result.setting} %c${result.mood}`, 'color: #9c27b0; font-weight: bold', 'color: #4caf50', 'color: #2196f3');
    return { setting: result.setting, mood: result.mood };
  } catch (err) {
    if (attempt < (CONFIG?.MAX_REPAIR ?? 1)) {
      console.warn('[settingAI] parse failed, retrying...', err);
      return determineSetting.call(this, params, attempt + 1);
    }
    console.error('[settingAI] failed after retries:', err);
    return null;
  }
}

// Create a bound version of determineSetting that maintains access to the module's scope
const boundDetermineSetting = determineSetting.bind({
  askAI,
  // Add other module-level functions/variables that might be needed
  CONFIG: window.CONFIG || {}
});

// Expose the bound helper
window.settingAI = { determineSetting: boundDetermineSetting };

