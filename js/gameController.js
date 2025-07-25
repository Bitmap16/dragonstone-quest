// Game controller: main game loop and logic

// Show the player's input as a dialogue line from "You"
function showYou(text) {
  dom.narration.classList.add("hidden");
  dom.dialogue.classList.remove("hidden");
  dom.spkName.textContent = "You";
  setNameColor("You");
  hideSprite();
  dom.dlgText.textContent = text;
}

// Process a player's action input by sending to AI and handling the response
async function chat(inputText) {
  // 1. Add the player's turn to history
  state.history.push({ role: "user", content: wrapYou(inputText) });
  if (state.history.length > CONFIG.MAX_LOGS) {
    state.history.splice(0, state.history.length - CONFIG.MAX_LOGS);
  }

  // 2. Build the prompt messages for the AI
  const messages = [
    { role: "system", content: SYS },
    { role: "system", content: "Current notes:" + JSON.stringify(state.notes) },
    ...state.history
  ];
  maybeInjectEvent(messages);

  // 3. Send to OpenAI or offline fallback and handle the result
  const rawResponse = await askAI(messages);

  // 4. Lock input and display the user's message
  dom.inputBar.style.display = "none";
  renderHUD();
  showYou(inputText);
  await waitClick();

  // 5. Store and process the assistant response
  state.history.push({ role: "assistant", content: rawResponse });
  await handleAI(rawResponse, 0);
}

// Handle the AI's JSON response and update game state/UI accordingly
async function handleAI(rawOutput, attempt = 0) {
  //  Parse or repair the JSON
  const data = safeParse(rawOutput);
  if (!data) {
    if (attempt >= CONFIG.MAX_REPAIR) {
      console.error("[AI] unrecoverable JSON error");
      return;
    }
    state.history.push({ role: "user", content: "Invalid JSON." });
    const repairMsgs = [{ role: "system", content: SYS }, ...state.history.slice(-CONFIG.MAX_LOGS)];
    const fix = await askAI(repairMsgs);
    state.history.push({ role: "assistant", content: fix });
    return handleAI(fix, attempt + 1);
  }

  //  Sync game state (party, items, mood)
  state.party = data.party ?? state.party;
  state.items = data.items ?? state.items;
  if (data.mood) {
    playMusic(data.mood);
  }
  renderHUD();

  //  Play out the dialogue sequence
  const lines = data.dialogue ?? [];
  // Ensure final line is "THE END" from DM if game over triggered without it
  if (data.gameOver && lines[lines.length - 1]?.speaker !== "DM") {
    lines.push({ speaker: "DM", text: "THE END" });
  }
  // Hide input while printing lines
  dom.inputBar.style.display = "none";
  renderHUD();
  for (const line of lines) {
  // Kick meltdown music back in at the perfect line
  if (
    line.speaker === "Nyx" &&
    line.text.includes("YOU'VE GOT TO BE KIDDING ME, YOU USELESS SACK OF DRAGON-!")
  ) {
    state.activeAudio.pause();
    state.activeAudio.src = "assets/music/meltdown/1.mp3";
    document.getElementById("api-warning")?.classList.remove("hidden");
    state.activeAudio.currentTime = 0;
    state.activeAudio.loop = true;
    state.activeAudio.volume = state.userVolume;
    state.activeAudio.play().catch(console.warn);
  }

  const isDM = line.speaker === "DM";

    if (isDM) {
      dom.narration.classList.remove("hidden");
      dom.dialogue.classList.add("hidden");
      hideSprite();
      await typer(line.text, dom.narration);
    } else {
      dom.narration.classList.add("hidden");
      dom.dialogue.classList.remove("hidden");
      dom.spkName.textContent = line.speaker;
      setNameColor(line.speaker);
      // Pass the full sprite path from the AI response
      showSprite(line.speaker, line.emotion);
      await typer(line.text, dom.dlgText);
    }
    await waitClick();
  }
  //  Restore input controls after dialogue
  dom.inputBar.style.display = "flex";
  dom.saveIcon.style.display = "block";
  dom.settingsIcon.style.display = "block";
  renderHUD();

  //  Summarize the recent dialogue into sticky notes (scribe AI)
  if (lines.length) {
    state.scribeBusy = true;
    notesThinking(true);
    try {
      const newNotes = await summarizerAI(lines, state.notes);
      if (Array.isArray(newNotes) && newNotes.length) {
        state.notes = newNotes;
      }
    } catch (err) {
      console.warn("[SCRIBE] summarizer failed:", err);
    } finally {
      state.scribeBusy = false;
      notesThinking(false);
      renderHUD();
    }
  }

  //  Handle game-over condition
  if (data.gameOver) {
    state.gameEnded = true;
    dom.inputBar.style.display = "none";
    dom.invBox.querySelectorAll(".use-btn").forEach(b => b.disabled = true);
    dom.endMsg.textContent = data.endReason ?? "THE END";
    dom.endOL.classList.remove("hidden");
  }
}

// One-time initial call to start the game (initial prompts)
async function kickoff() {
  const introMessages = [
    { role: "system", content: SYS },
    { role: "system", content: "Current notes: []" },
    { role: "user", content: CONFIG.INITIAL_PROMPT }
  ];
  const introRaw = await askAI(introMessages);
  state.history.push({ role: "assistant", content: introRaw });
  await handleAI(introRaw, 0);
  // After intro, enable save & settings icons
  dom.saveIcon.style.display = "block";
  dom.settingsIcon.style.display = "block";
}

// Unlock audio context on first user gesture (for autoplay background music)
function unlockAudio() {
  if (state.audioUnlocked) return;
  state.audioUnlocked = true;
  state.activeAudio.play().catch(console.warn);
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
  
  bindInputHandlers();
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
  state.items = [ { sword: 1 }, { torch: 3 } ];
  state.history = [];
  state.currentMood = "";
  state.userVolume = CONFIG.USER_VOLUME;
  state.muted = false;
  state.audioUnlocked = false;
  state.gameEnded = false;
  state.scribeBusy = false;
  // Stop any playing audio
  state.activeAudio.pause(); state.activeAudio.currentTime = 0; state.activeAudio.src = "";
  state.idleAudio.pause(); state.idleAudio.currentTime = 0; state.idleAudio.src = "";
  // Hide end overlay and re-enable input
  dom.endOL.classList.add("hidden");
  dom.inputBar.style.display = "flex";
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
