// Game state management
const state = {
  // Dynamic quest data
  notes: [],
  partyColors: {},

  // Default party and inventory
  party: { You: "Health:100", Nyx: "Health:100", Kael: "Health:100" },
  items: JSON.parse(JSON.stringify(CONFIG.START_ITEMS)), // deep copy

  // Turn history and current mood
  history: [],
  currentMood: "",

  // Audio settings and flags
  userVolume: CONFIG.USER_VOLUME,
  muted: false,
  audioUnlocked: false,

  // Game flow flags
  gameEnded: false,
  scribeBusy: false,   // lock notes while summarizer runs
  freeTextUnlocked: false // Free text input disabled by default
};

// Initialize audio tracks (two Audio objects for crossfade music)
state.activeAudio = new Audio();
state.idleAudio = new Audio();
state.activeAudio.loop = state.idleAudio.loop = false;

// Note: Save/load functionality has been moved to gameController.js
