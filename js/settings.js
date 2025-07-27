import { dom } from './ui.js';

// Settings system - manages available game settings and their metadata

let SETTINGS_MANIFEST = {
  settings: []
};

let manifestLoaded = false;
let manifestLoading = null;

/**
 * Ensure the settings manifest is loaded
 * @returns {Promise<boolean>} True if manifest loaded successfully
 */
async function ensureManifestLoaded() {
  if (manifestLoaded) return true;
  if (manifestLoading) return manifestLoading;

  manifestLoading = (async () => {
    try {
      const response = await fetch('settings-manifest.json');
      SETTINGS_MANIFEST = await response.json();
      console.log('[settings] Settings manifest loaded successfully');
      manifestLoaded = true;
      return true;
    } catch (error) {
      console.warn('[settings] Failed to load settings manifest, using empty manifest:', error);
      SETTINGS_MANIFEST = { settings: [] };
      return false;
    } finally {
      manifestLoading = null;
    }
  })();

  return manifestLoading;
}

/**
 * Get the list of available settings
 * @returns {Promise<string[]>} Array of setting IDs
 */
/**
 * Update the game's background image.
 * @param {string} settingName The name of the setting (e.g., 'forest')
 */
function updateSetting(settingName) {
  if (!settingName) {
    console.warn('[settings] updateSetting called with no setting name.');
    return;
  }

  // The background element is defined in js/dom.js
  if (dom?.background) {
    const bgPath = `assets/settings/${settingName}.png`;
    
    // Verify the image exists before setting it
    const img = new Image();
    img.src = bgPath;
    img.onload = () => {
      dom.background.src = bgPath;
      console.log(`[settings] Background updated to: ${settingName}`);
    };
    img.onerror = () => {
      console.warn(`[settings] Background image not found at ${bgPath}. Keeping current background.`);
    };
  } else {
    console.error('[settings] dom.background element not found.');
  }
}

/**
 * Get the list of available settings
 * @returns {Promise<string[]>} Array of setting IDs
 */
async function getAvailableSettings() {
  await ensureManifestLoaded();
  return [...(SETTINGS_MANIFEST.settings || [])];
}



// Expose public functions
window.settings = {
  ensureManifestLoaded,
  getAvailableSettings,
  updateSetting,
  get manifest() {
    return {...SETTINGS_MANIFEST};
  }
};

// Initialize on load
ensureManifestLoaded().catch(console.error);
