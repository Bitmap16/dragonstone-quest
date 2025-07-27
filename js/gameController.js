import { SYS, askAI, safeParse, maybeInjectEvent } from './prompts/storyAI.js';
import { summarizerAI } from './prompts/scribeAI.js';
import { getPlayerActions } from './prompts/actionAI.js';
import {
  $,
  dom,
  renderHUD,
  hideSprite,
  showSprite,
  showYou,
  showThem,
  showNarration,
  typer,
  waitClick,
  thinking,
  notesThinking,
  updateInputDisplay,
  showActionButtons,
  setNameColor,
  bindInputHandlers
} from './ui.js';

// Game controller: main game loop and logic

// Process a player's action input by sending to AI and handling the response
async function chat(inputText) {
  // Hide action buttons and show input while processing
  dom.actionBtns.classList.add("hidden");
  dom.actionBtns.innerHTML = ''; // Clear previous buttons
  // Hide input elements uniformly via helper
  updateInputDisplay();
  
  // 1. Add the player's turn to history
  state.history.push({ role: "user", content: wrapYou(inputText) });
  if (state.history.length > CONFIG.MAX_LOGS) {
    state.history.splice(0, state.history.length - CONFIG.MAX_LOGS);
  }

  // 2. Show the player's message immediately
  showYou(inputText);
  await waitClick();

  // 3. Build the prompt messages for the AI
  const messages = [
    { role: "system", content: SYS },
    { role: "system", content: "Current notes:" + JSON.stringify(state.notes) },
    ...state.history
  ];
  maybeInjectEvent(messages);

  // 4. Send to OpenAI or offline fallback and handle the result
  const rawResponse = await askAI(messages);

  // 5. Store and process the assistant response
  state.history.push({ role: "assistant", content: rawResponse });
  await handleAI(rawResponse, 0);
}

// Handle the AI's JSON response and update game state/UI accordingly
async function handleAI(rawOutput, attempt = 0, skipSetting = false) {
  // Safety check to prevent infinite loops
  if (attempt >= 2) { // Only allow 2 repair attempts
    console.error("[AI] Maximum repair attempts reached. Using fallback response.");
    // Show error to user
    await showNarration("The storyteller seems to be having trouble. Let's try something else...");
    // Force a valid game state
    return showActionButtons(["Continue forward", "Look around", "Check inventory"], chat);
  }

  // Parse or repair the JSON
  const data = safeParse(rawOutput);

  // If we can't parse the JSON, try to get a better response
  if (!data || !data.dialogue) {
    console.warn("[AI] Invalid or missing JSON response, attempting repair...");
    
    // Don't add invalid responses to history to prevent pollution
    if (attempt === 0) {
      // Only add the repair message on first attempt to avoid flooding history
      state.history.push({ 
        role: "system", 
        content: "ERROR: Your last response was not valid JSON. Please respond with a properly formatted JSON object containing at least a 'dialogue' array."
      });
    }
    
    // Get a fresh response with a more specific prompt
    const repairMsgs = [
      { role: "system", content: SYS },
      { role: "system", content: "IMPORTANT: You MUST respond with valid JSON containing at minimum a 'dialogue' array with speaker/text objects." },
      ...state.history.slice(-CONFIG.MAX_LOGS)
    ];
    
    const fix = await askAI(repairMsgs);
    // Don't push to history yet - we'll validate it in the next attempt
    return handleAI(fix, attempt + 1);
  }

  // Sync game state (party, items)
  state.party = data.party ?? state.party;
  state.items = data.items ?? state.items;
  renderHUD();

  // Get dialogue lines
  let lines = data.dialogue ?? [];
  // QoL: Split overly long dialogue into shorter chunks (~180 chars)
  const splitLines = [];
  const MAX_LEN = 180;
  for (const ln of lines) {
    if (ln.text && ln.text.length > MAX_LEN) {
      // Split on sentence endings followed by space
      const parts = ln.text.split(/(?<=[.!?])\s+/);
      let buffer = "";
      for (const part of parts) {
        if ((buffer + " " + part).trim().length > MAX_LEN && buffer) {
          splitLines.push({ ...ln, text: buffer.trim() });
          buffer = part;
        } else {
          buffer += (buffer ? " " : "") + part;
        }
      }
      if (buffer.trim()) splitLines.push({ ...ln, text: buffer.trim() });
    } else {
      splitLines.push(ln);
    }
  }
  lines = splitLines;
  if (data.gameOver && lines[lines.length - 1]?.speaker !== "DM") {
    lines.push({ speaker: "DM", text: "THE END" });
  }
  
  // Process settings and get actions first
  let actions = [];
  if (!data.gameOver) {
    try {
      // Update setting based on the current context
      // Only run settingAI after kickoff is complete
      if (state.kickoffCompleted && window.settingAI?.determineSetting) {
        const pastDialogue = state.history
          .map(msg => `${msg.role === 'user' ? 'Player' : 'Narrator'}: ${msg.content}`)
          .join('\n')
          .slice(-2000);

        const availableSettings = window.settings?.getAvailableSettings?.() || [];
        const availableMoods = Object.keys(window.audio?.MUSIC_MANIFEST || {});

        const settingData = await window.settingAI.determineSetting({
          pastSettings: state.history.map(h => h.content).join('\n'),
          pastDialogue: lines.map(l => `${l.speaker}: ${l.text}`).join('\n'),
          availableSettings,
          availableMoods
        });
        
        if (settingData?.setting) {
          const bgElement = document.getElementById('background');
          if (bgElement && settingData.setting !== bgElement.dataset.currentSetting) {
            bgElement.style.backgroundImage = `url('assets/settings/${settingData.setting}.png')`;
            bgElement.dataset.currentSetting = settingData.setting;
          }
        }
        
        // Update music if mood is provided and different from current
        if (settingData?.mood && settingData.mood !== state.currentMood) {
           if (window.audio?.playMusic) {
             window.audio.playMusic(settingData.mood);
           }
         }
      }
      
      // Get actions for after dialogue
      if (getPlayerActions) {
        // Get the last 10 messages for context, including both user and assistant messages
        const recentHistory = state.history.slice(-10);
        
        try {
          actions = await getPlayerActions(recentHistory) || [];
          // Ensure we have at least one action
          if (actions.length === 0) {
            console.warn('No actions returned from getPlayerActions, using fallback actions');
            actions = ["I continue forward.", "I look around.", "I check my inventory."];
          }
        } catch (error) {
          console.error('Error getting player actions:', error);
          actions = ["I continue forward.", "I look around.", "I check my inventory."];
        }
      }
    } catch (error) {
      console.error('Error in AI flow:', error);
      // Provide fallback actions if there's an error
      actions = ["I continue forward.", "I look around.", "I check my inventory."];
    }
  }
  
  // Show all dialogue lines
  for (const line of lines) {
    // Kick meltdown music back in at the perfect line
    if (
      line.speaker === "Nyx" &&
      line.text.includes("YOU'VE GOT TO BE KIDDING ME, YOU USELESS SACK OF DRAGON-!")
    ) {
      state.activeAudio.pause();
      state.activeAudio.src = "music/meltdown/1.mp3";
      document.getElementById("api-warning")?.classList.remove("hidden");
      state.activeAudio.currentTime = 0;
      state.activeAudio.loop = true;
      state.activeAudio.volume = state.userVolume;
      state.activeAudio.play().catch(console.warn);
    }

    if (line.speaker === 'DM') {
      await showNarration(line.text);
    } else {
      showSprite(line.speaker, line.sprite);
      await showThem(line.speaker, line.text);
    }
    await waitClick();
  }
  
  // Show action buttons after dialogue is complete
  if (actions.length > 0 && !data.gameOver) {
    showActionButtons(actions, (action) => {
      chat(action.replace(/^["']|["']$/g, ''));
    });
  }
  
  thinking(false); // Hide thinking overlay

  // Restore UI icons
  dom.saveIcon.style.display = "block";
  dom.settingsIcon.style.display = "block";

  // Decide which input elements to show for the next turn
  if (!data.gameOver) {
    if (state.freeTextUnlocked) {
      updateInputDisplay(); // Show text input
      dom.userIn.focus();
    } else if (actions.length > 0) {
      showActionButtons(actions, chat);
    updateInputDisplay();
  // Restore appropriate input/action UI
  updateInputDisplay();
    } else {
      // Fallback in case no actions were generated
      console.warn('No actions available, showing default input');
      updateInputDisplay();
    }
  }

  // ── Update sticky notes with Scribe AI ─────────────
  state.scribeBusy = true;
  notesThinking(true);
  summarizerAI(lines, state.notes)
    .then(newNotes => {
      state.notes = newNotes;
      renderHUD();
    })
    .catch(err => {
      console.error('[scribeAI] summarizerAI failed:', err);
    })
    .finally(() => {
      state.scribeBusy = false;
      notesThinking(false);
      renderHUD();
    });

  // Check for game over
  if (data.gameOver) {
    state.gameEnded = true;
    dom.endOL.classList.remove("hidden");
    updateInputDisplay();
  }
}

// One-time initial call to start the game (initial prompts)
async function kickoff() {
  thinking(true);
  try {
    // Default starting setting & mood (skip initial settingAI call)
    console.log('[kickoff] Using default starting setting and mood');
    window.settings.updateSetting('adventure-begins');
    playMusic('narrative/foreboding');

    // Build initial prompt for story AI
    const initialMessages = [
      { role: 'system', content: SYS },
      { role: 'system', content: 'Current Setting: adventure-begins' },
      { role: 'system', content: 'Starting items: ' + JSON.stringify(CONFIG.START_ITEMS) },
      { role: 'user', content: CONFIG.INITIAL_PROMPT },
    ];

    const rawResponse = await askAI(initialMessages);
    state.history.push({ role: 'assistant', content: rawResponse });

    notesThinking(true);
    await handleAI(rawResponse, 0);
  } catch (error) {
    console.error('[kickoff] A critical error occurred during initialization:', error);
    try {
      // Basic fallback
      window.settings.updateSetting('adventure-begins');
      playMusic('narrative/foreboding');
      await showNarration("The storyteller is having trouble starting the adventure. Let's begin your journey...");
      const initialActions = ['Look around', 'Check your gear', 'Talk to your companions'];
      showActionButtons(initialActions, chat);
    } catch (fallbackError) {
      console.error('[kickoff] Fallback initialization failed:', fallbackError);
    }
  } finally {
    thinking(false);
    notesThinking(false);
    // Mark kickoff complete so settingAI can run on later turns
    state.kickoffCompleted = true;
  }
}

// Unlock audio context on first user gesture (for autoplay background music)
function unlockAudio() {
  if (state.audioUnlocked) return;
  state.audioUnlocked = true;
  // Don't try to play audio without a source
  if (state.activeAudio.src) {
    state.activeAudio.play().catch(console.warn);
  }
}

// Bind top-right save menu interactions
dom.saveIcon.onclick = () => {
  dom.saveDD.classList.toggle("hidden");
  dom.saveIcon.setAttribute("aria-expanded", dom.saveDD.classList.contains("hidden") ? "false" : "true");
};
addEventListener("click", e => {
  if (!dom.saveIcon.contains(e.target) && !dom.saveDD.contains(e.target)) {
    dom.saveDD.classList.add("hidden");
    dom.saveIcon.setAttribute("aria-expanded", "false");
  }
});
$("save-file").onclick = () => {
  dom.saveDD.classList.add("hidden");
  saveToFile();
};
$("load-file").onclick = () => {
  dom.saveDD.classList.add("hidden");
  loadFromFile();
};

// Initialize game
function initGame() {
  // Make sure DOM elements are available
  if (!dom.startOverlay || !dom.startBtn || !dom.apiKeyInput) {
    // If elements aren't in the DOM yet, wait a bit and try again
    setTimeout(initGame, 100);
    return;
  }
  
  bindInputHandlers(chat);
  // Expose a global dispatcher so inventory 'Use' buttons can trigger chat actions.
  window.dispatchUseAction = chat;
  renderHUD();
  
  // Set up start button click handler
  dom.startBtn.addEventListener('click', () => {
    const userApiKey = dom.apiKeyInput.value.trim();
    
    // If user provided an API key, use it
    if (userApiKey) {
      CONFIG.OPENAI_API_KEY = userApiKey;
      // Save to localStorage for future sessions
      localStorage.setItem('openai_api_key', userApiKey);
    }
    
    // Hide the start overlay
    dom.startOverlay.style.display = 'none';
    
    // Start the game
    unlockAudio();
    kickoff();
  });
  
  // Check for saved API key
  const savedApiKey = localStorage.getItem('openai_api_key');
  if (savedApiKey) {
    dom.apiKeyInput.value = savedApiKey;
  }
  
  // Show the start overlay
  dom.startOverlay.style.display = 'flex';
}

// Start the game when the page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initGame);
} else {
  // DOM already loaded, initialize immediately
  initGame();
}

// Restart game on "Begin a new adventure" (end screen) button click
dom.restartBtn.onclick = () => {
  // Reset dynamic state to initial values
  state.notes = [];
  state.partyColors = {};
  state.party = { You: "Health:100", Nyx: "Health:100", Kael: "Health:100" };
  state.items = [ { "Short Sword": 1 }, { "Lockpick Set": 1 }, { "Gold Coin": 15 } ];
  state.history = [];
  state.currentMood = "";
  state.userVolume = CONFIG.USER_VOLUME;
  state.muted = false;
  state.audioUnlocked = false;
  state.gameEnded = false;
  state.scribeBusy = false;
  state.freeTextUnlocked = false; // Reset for new game

  // Stop any playing audio
  state.activeAudio.pause(); state.activeAudio.currentTime = 0; state.activeAudio.src = "";
  state.idleAudio.pause(); state.idleAudio.currentTime = 0; state.idleAudio.src = "";

  // Hide end overlay and re-enable input
  dom.endOL.classList.add("hidden");
  updateInputDisplay();
  // Re-enable any disabled inventory use buttons
  dom.invBox.querySelectorAll(".use-btn").forEach(b => { b.disabled = false; });
  // Clear dialogue and narration displays
  dom.narration.textContent = "";
  dom.dialogue.classList.add("hidden");
  hideSprite();
  // Hide save & settings icons until game restarts
  dom.saveIcon.style.display = "none";
  dom.settingsIcon.style.display = "none";
  // Redraw HUD and restart intro sequence
  renderHUD();
  kickoff();
};

// Helper: wrap player input in a narrative-friendly format if needed
function wrapYou(text) {
  // For this game, we can simply return text as-is; adjust if any format needed.
  return text;
}
