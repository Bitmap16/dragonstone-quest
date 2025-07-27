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

// Hidden file input for save/load
const fileInput = Object.assign(document.createElement("input"), {
  type: "file",
  accept: ".json",
  hidden: true
});
document.body.appendChild(fileInput);

// State persistence helpers
function savePayload() {
  return JSON.stringify({
    notes: state.notes,
    party: state.party,
    items: state.items,
    history: state.history,
    mood: state.currentMood
  });
}

function saveToFile() {
  const blob = new Blob([savePayload()], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const ts = new Date().toISOString().slice(0, 16).replace("T", "_").replace(":", "-");
  a.download = `dragonstone-save-${ts}.json`;
  a.href = url;
  a.click();
  URL.revokeObjectURL(url);
  console.log("[SAVE] file", a.download);
}

function loadFromFile() {
  fileInput.click();
  fileInput.onchange = () => {
    const f = fileInput.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const d = JSON.parse(e.target.result);
        Object.assign(state, {
          notes: Array.isArray(d.notes) ? d.notes : [],
          party: d.party ?? {},
          items: Array.isArray(d.items) ? d.items : [],
          history: Array.isArray(d.history) ? d.history : [],
          currentMood: d.mood ?? ""
        });
        console.log("[LOAD] file →", state);
        renderHUD();
        if (state.currentMood) playMusic(state.currentMood, true);
        dom.endOL.classList.add("hidden");
        if (state.history.length) handleAI(state.history.at(-1).content, 0);
      } catch (err) {
        console.error(err);
        alert("Invalid save file.");
      }
    };
    reader.readAsText(f);
  };
}
