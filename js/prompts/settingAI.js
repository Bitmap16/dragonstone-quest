// settingAI.js - Handles scene/setting management based on story context
// Uses a sliding window of past settings and dialogue to determine appropriate scene changes

import { askAI } from './storyAI.js';
import { Console } from '../gameController.js';


// This will be populated with available settings when the module loads
let AVAILABLE_SETTINGS = [];
let AVAILABLE_MOODS = [];

// Load available settings and moods
async function loadAvailableOptions() {
  try {
    // Get settings from settings module
    if (window.settings && window.settings.getAvailableSettings) {
      AVAILABLE_SETTINGS = await window.settings.getAvailableSettings();
      Console.info('Loaded settings', AVAILABLE_SETTINGS);
    } else {
      Console.warning('window.settings not available yet, will retry later');
    }
    
    // Get moods from audio module if available
    if (window.audio && window.audio.loadMusicManifest) {
      await window.audio.loadMusicManifest();
      // Access MUSIC_MANIFEST dynamically from the audio module
      const musicManifest = window.audio.getMusicManifest ? window.audio.getMusicManifest() : {};
      AVAILABLE_MOODS = Object.keys(musicManifest);
      Console.info('Loaded moods', AVAILABLE_MOODS);
    } else {
      Console.warning('window.audio not available yet, will retry later');
    }
  } catch (error) {
    Console.error('Failed to load available options', error);
  }
}

// Initialize when the module loads (with retry logic)
function initializeWithRetry(attempts = 0) {
  const maxAttempts = 10;
  const retryDelay = 500; // 500ms
  
  loadAvailableOptions().then(() => {
    // Success - check if we got the data we need
    if (AVAILABLE_SETTINGS.length === 0 || AVAILABLE_MOODS.length === 0) {
      if (attempts < maxAttempts) {
        Console.info(`[settingAI] Retrying initialization (attempt ${attempts + 1}/${maxAttempts})`);
        setTimeout(() => initializeWithRetry(attempts + 1), retryDelay);
      } else {
        Console.warning('[settingAI] Max initialization attempts reached');
      }
    }
  }).catch(error => {
    if (attempts < maxAttempts) {
      Console.info(`[settingAI] Retrying initialization after error (attempt ${attempts + 1}/${maxAttempts})`);
      setTimeout(() => initializeWithRetry(attempts + 1), retryDelay);
    } else {
      Console.error('[settingAI] Failed to initialize after max attempts', error);
    }
  });
}

// Start initialization
initializeWithRetry();

function getSettingPrompt() {
  return `You are the Setting AI for a text-only fantasy RPG.
Your task is to figure out the location in the current scene. If unsure, avoid changing scenes too often.

Return ONLY valid JSON (no markdown, no comments):
{
  "setting": "<location>"
}

Example:

{
  "setting": "autumn_glade"
}

Available Settings

YOU MUST CHOOSE ONE OF THE FOLLOWING SETTINGS:
${AVAILABLE_SETTINGS.map(s => `- ${s}`).join('\n')}

Guidelines:
1. Base your choice on the narrative context and any provided dialogue.
2. Avoid picking a setting that's being described and not the current location of the characters.
3. Keep output to a single line of JSON.`;
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
    
    if (!result?.setting) {
      throw new Error('Invalid response format: missing setting field');
    }
    
    // Validate that the returned setting and mood are in our available lists
    // Force lowercase to prevent errors with AI capitalization
    if (result.setting) {
        result.setting = result.setting.toLowerCase();
        const isValidSetting = AVAILABLE_SETTINGS.some(s => s.toLowerCase() === result.setting);
        // Setting validation handled internally
        if (!isValidSetting) {
            Console.warning(`[settingAI] Invalid setting returned: '${result.setting}'. Current background will be kept.`);
            result.setting = null; // Set to null to indicate no change
        }
    }

    
    
    // Setting selection handled internally
    return { setting: result.setting };
  } catch (err) {
    if (attempt < (CONFIG?.MAX_REPAIR ?? 1)) {
      Console.warning('[settingAI] parse failed, retrying...', err);
      return determineSetting.call(this, params, attempt + 1);
    }
    Console.error('[settingAI] failed after retries:', err);
    return null;
  }
}

// ───── Mood helper prompt ───────────────────────────────
function getMoodPrompt() {
  return `You are the Mood AI for a text-only fantasy RPG.
Your task is to select the background *music mood* for the upcoming scene.

Return ONLY valid JSON (no markdown, no comments):
{
  "mood": "<mood-directory>"
}

Example:
{
  "mood": "narrative/foreboding"
}

Available Moods (choose exactly one of these for "mood"):
${AVAILABLE_MOODS.map(m => `- ${m}`).join('\n')}

Guidelines:
1. The mood must be one of the available moods listed above.
2. Match the emotional tone of the scene.
3. Keep output to a single line of JSON.`;
}

// ───── Mood selector function ───────────────────────────
async function determineMood(params, attempt = 0) {
  const { pastDialogue = "" } = params || {};
  try {
    await loadAvailableOptions();
    if (AVAILABLE_MOODS.length === 0) {
      Console.warning('[settingAI] No moods available');
    }
    const messages = [
      { role: 'system', content: getMoodPrompt() },
      { role: 'user', content: `Recent dialogue:\n${pastDialogue}` }
    ];
    const raw = await askAI(messages, { model: CONFIG.SETTING_MODEL });
    const cleaned = raw.replace(/```(?:json)?\s*([\s\S]*?)```/i, "$1").trim();
    const result = JSON.parse(cleaned);
    if (!result?.mood) throw new Error('Invalid response: missing mood');
    result.mood = result.mood.toLowerCase();
    const valid = AVAILABLE_MOODS.some(m => m.toLowerCase() === result.mood);
    if (!valid) {
      Console.warning(`[settingAI] Invalid mood '${result.mood}', defaulting to narrative/foreboding`);
      result.mood = 'narrative/foreboding';
    }
    // Mood selection handled internally
    return { mood: result.mood };
  } catch (err) {
    if (attempt < (CONFIG?.MAX_REPAIR ?? 1)) {
      Console.warning('[settingAI] mood parse failed, retrying...', err);
      return determineMood(params, attempt + 1);
    }
    Console.error('[settingAI] determineMood failed:', err);
    return null;
  }
}

// Bind helpers to preserve scope
const boundDetermineSetting = determineSetting.bind({ askAI, CONFIG: window.CONFIG || {} });
const boundDetermineMood    = determineMood.bind({ askAI, CONFIG: window.CONFIG || {} });

// Expose
window.settingAI = { determineSetting: boundDetermineSetting, determineMood: boundDetermineMood };

