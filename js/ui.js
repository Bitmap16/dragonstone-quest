// UI handler: DOM caching, rendering, and event bindings

// DOM element shorthand
export const $ = id => document.getElementById(id);

// Cache important DOM elements
export const dom = {
  // Stage & dialogue elements
  stage: $("characters"),
  sprite: $("speaker-sprite") || (() => {
    const img = document.createElement("img");
    img.id = "speaker-sprite";
    img.className = "sprite";
    $("characters").appendChild(img);
    return img;
  })(),
  narration: $("narration"),
  dialogue: $("dialogue"),
  spkName: $("speaker-name"),
  dlgText: $("dialogue-text"),

  // Input elements
  inputBar: $("input-bar"),
  userIn: $("user-input"),
  sendBtn: $("send-btn"),
  actionBtns: $("action-buttons"),
  thinking: $("thinking"),

  // Sidebar element
  sidebar: $("sidebar"),
  sidebarToggle: $("sidebar-toggle"),
  partyFixed: $("party-fixed"),

  // Sidebar boxes
  partyBox: $("party-box"),
  invBox: $("inv-box"),
  notesBox: $("notes-box"),
  notesLoader: $("notes-loader"),

  // Overlays and modals
  startOverlay: $("start-overlay"),
  startBtn: $("start-btn"),
  apiKeyInput: $("api-key"),
  endOL: $("end-overlay"),
  endMsg: $("end-title"),
  restartBtn: $("restart"),
  background: $("background"),

  // Top-right icons
  saveIcon: $("save-icon"),
  saveDD: $("save-dd"),
  settingsIcon: $("settings-btn"),
  textToggle: $("text-toggle"),
  fullscreenBtn: document.getElementById('fullscreen-btn'),

  // Settings panel elements
  settingsModal: $("settings-modal"),
  setVolume: $("set-volume"),
  setTextSpeed: $("set-textspeed"),
  setCrass: $("set-crass"),
  valVolume: $("val-volume"),
  valTextSpeed: $("val-textspeed"),

  // Note add button
  addNoteBtn: $("add-note")
};

// Determine if an overlay/modal is currently active
function isOverlayActive() {
  return (
    !dom.settingsModal.classList.contains("hidden") ||
    (dom.startOL && dom.startOL.style.display !== "none") ||
    (dom.endOL && !dom.endOL.classList.contains("hidden")) ||
    (dom.thinking && dom.thinking.classList.contains("visible"))
  );
}

// Check if dialogue is currently being rendered (typing animation active)
function isDialogueActive() {
  // Only block settings changes during actual typing animations, not thinking/loading
  return (
    (dom.dlgText && dom.dlgText._currentAnimation) ||
    (dom.narration && dom.narration._currentAnimation)
  );
}

// Check if notes are editable (no overlays and game running)
function canEditNotes() {
  // Notes can be edited as long as the game is running, the scribe isn't busy,
  // and no overlay (start, end, settings, thinking) is active.
  const awaitingPlayer = (
    (dom.actionBtns && !dom.actionBtns.classList.contains("hidden")) ||
    (dom.inputBar && dom.inputBar.style.display !== "none")
  );
  return awaitingPlayer && !state.gameEnded && !state.scribeBusy && !isOverlayActive();
}

// Save or delete note on blur (stop editing)
function saveNoteEdit(noteElem) {
  const idx = +noteElem.dataset.idx;
  const text = noteElem.textContent.replace("×", "").trim();
  if (text) {
    state.notes[idx] = text;
  } else {
    state.notes.splice(idx, 1);
  }
  renderHUD();
}

// Key handler for note editing (press Enter to finish editing)
function noteKeyHandler(e) {
  if (e.key === "Enter") {
    e.preventDefault();
    e.currentTarget.blur();
  }
}

// Render the HUD (Party, Inventory, Notes sections) based on current state
export function renderHUD() {
  // Party heading shows live count
  const partyCount = Object.keys(state.party).length;
  document.querySelector("#sidebar h2:nth-of-type(1)").textContent = `Party (${partyCount})`;

  // Party list with health bars
  dom.partyBox.replaceChildren(
    ...Object.entries(state.party).map(([name, hpStr]) => {
      const hpVal = Math.min(parseInt(hpStr.match(/\d+/)?.[0] || 0), 100);
      const row = document.createElement("div");
      row.className = `row ${cssClassFor(name)}`;
      row.innerHTML = `
        <span>${name}</span>
        <span class="health-bar" style="--hp:${hpVal}%"><span></span></span>`;
      return row;
    })
  );

  // Inventory list
  dom.invBox.replaceChildren(
    ...state.items.map(itemObj => {
      const [itemName, count] = Object.entries(itemObj)[0];
      const row = document.createElement("div");
      row.className = "row";
      const glow = /dragonstone/i.test(itemName) ? "glow-dragonstone" : "";
      row.innerHTML = `
        <span class="${glow}">${itemName} × ${count}</span>
        <button class="use-btn" data-item="${itemName}">Use</button>`;
      // Attach click handler to trigger a use action via global dispatcher
      const btn = row.querySelector('.use-btn');
      btn.onclick = () => {
        if (typeof window.dispatchUseAction === 'function') {
          window.dispatchUseAction(`Use ${itemName}`);
        }
      };
      return row;
    })
  );

  // Sticky Notes list
  const editable = canEditNotes();
  const safeNotes = Array.isArray(state.notes) ? state.notes : [];
  dom.notesBox.replaceChildren(
    ...safeNotes.map((text, idx) => {
      const note = document.createElement("div");
      note.className = "row note";
      note.dataset.idx = idx;
      note.contentEditable = editable;
      note.spellcheck = false;
      note.style.setProperty("--tilt", idx % 2 ? "-2deg" : "2deg");
      note.style.background = pastel(text);
      note.textContent = text;
      if (editable) {
        // Add delete button for editable notes
        const delBtn = document.createElement("button");
        delBtn.className = "del-note";
        delBtn.textContent = "×";
        delBtn.setAttribute("aria-label", "Delete note");
        delBtn.contentEditable = "false";
        delBtn.onclick = () => {
          if (!canEditNotes()) return;
          state.notes.splice(idx, 1);
          renderHUD();
        };
        note.appendChild(delBtn);
        // Bind editing event handlers
        note.addEventListener("keydown", noteKeyHandler);
        note.addEventListener("blur", () => saveNoteEdit(note));
      }
      return note;
    })
  );

  // Enable or hide the "add note" button
  dom.addNoteBtn.disabled = !editable;
  dom.addNoteBtn.classList.toggle("hidden", !editable);

  // Update scroll shadow classes after rendering
  updateNoteShadows();
  updateInvShadows();
  updatePartyShadows();
  updateFixedParty();
}

// Functions to update scroll shadow visibility for notes, inventory, party
function applyFadeClasses(scroller, wrapper) {
  if (!scroller || !wrapper) return;
  const top = scroller.scrollTop;
  const bottom = scroller.scrollHeight - scroller.clientHeight - top;
  wrapper.classList.toggle("has-top-shadow", top > 4);
  wrapper.classList.toggle("has-bottom-shadow", bottom > 4);
}
function updateNoteShadows() { applyFadeClasses(dom.notesBox, document.getElementById("notes-wrap")); }
function updateInvShadows()  { applyFadeClasses(dom.invBox, document.getElementById("inv-wrap")); }
function updatePartyShadows() { applyFadeClasses(dom.partyBox, document.getElementById("party-wrap")); }

// Attach scroll listeners for shadow updates
dom.notesBox?.addEventListener("scroll", updateNoteShadows);
dom.invBox?.addEventListener("scroll", updateInvShadows);
dom.partyBox?.addEventListener("scroll", updatePartyShadows);

// Sprite visibility control
export function hideSprite() {
  dom.sprite.classList.remove("show");
}
dom.sprite.addEventListener("error", () => {
  console.warn("[SPRITE] missing asset – hiding sprite");
  hideSprite();
  dom.sprite.removeAttribute("src");
  showSprite.lastSpeaker = "";
  showSprite.lastSrc = "";
});

export function showSprite(name = "", spritePath = "") {
  // If no sprite path is provided, use a default neutral expression
  if (!spritePath) {
    const charName = name.toLowerCase();
    // Default fallback paths (should rarely be used as AI should provide full paths)
    const defaultPaths = {
      'nyx': 'assets/expressions/nyx/neutral.png',
      'kael': 'assets/expressions/kael/neutral.png'
    };
    spritePath = defaultPaths[charName] || '';
  }
  
  if (!name || name.toLowerCase() === "you" || !spritePath) {
    hideSprite();
    return;
  }
  
  // Check if we're already showing this exact sprite
  if (spritePath === showSprite.lastSrc) {
    // Re-use already loaded image
    dom.sprite.classList.add("show");
    return;
  }
  
  // Prepare new sprite image
  showSprite.lastSpeaker = name;
  showSprite.lastSrc = spritePath;
  
  if (!dom.sprite.classList.contains("show")) {
    // If sprite is not currently showing, set the src and show it
    dom.sprite.src = spritePath;
    if (dom.sprite.complete) {
      dom.sprite.classList.add("show");
    } else {
      dom.sprite.onload = () => dom.sprite.classList.add("show");
    }
  } else {
    hideSprite();
    dom.sprite.addEventListener("transitionend", function swap() {
      dom.sprite.removeEventListener("transitionend", swap);
      dom.sprite.src = spritePath;
      if (dom.sprite.complete) {
        dom.sprite.classList.add("show");
      } else {
        dom.sprite.onload = () => dom.sprite.classList.add("show");
      }
    }, { once: true });
  }
}
showSprite.lastSpeaker = "";
showSprite.lastSrc = "";

// Dialogue and narration rendering
export function showYou(text) {
  document.getElementById('party-fixed')?.classList.remove('hp-off');
  dom.narration.classList.add("hidden");
  dom.dialogue.classList.remove("hidden");
  dom.spkName.textContent = "You";
  setNameColor("You");
  hideSprite();
  dom.dlgText.textContent = text;
  dom.inputBar.style.display = "none";
  dom.inputBar.classList.remove("show");
  dom.actionBtns.classList.add("hidden");
}

export function showThem(name, text) {
  // Bring HP bars back when characters speak
  document.getElementById('party-fixed')?.classList.remove('hp-off');
  dom.narration.classList.add("hidden");
  dom.dialogue.classList.remove("hidden");
  dom.dialogue.classList.add("show");
  dom.spkName.textContent = name;
  setNameColor(name);
  // showSprite() is handled separately
  dom.inputBar.style.display = "none";
  dom.inputBar.classList.remove("show");
  dom.actionBtns.classList.add("hidden");
  return typer(text, dom.dlgText);
}

export function showNarration(text) {
  // Hide HP bars on small screens to avoid overlap
  if (window.innerWidth <= 720) {
    document.getElementById('party-fixed')?.classList.add('hp-off');
  }
  dom.dialogue.classList.add("hidden");
  dom.narration.classList.remove("hidden");
  hideSprite();
  dom.inputBar.style.display = "none";
  dom.inputBar.classList.remove("show");
  dom.actionBtns.classList.add("hidden");
  return typer(text, dom.narration);
}



// Typing effect for dialogue text
export let isMouseDown = false;
addEventListener("mousedown", () => { isMouseDown = true; });
addEventListener("mouseup", () => { isMouseDown = false; });

export const typer = (txt, el, speed = CONFIG.TEXT_SPEED, boost = CONFIG.TEXT_BOOST) => {
  return new Promise(resolve => {
    el.textContent = "";
    let i = 0;
    let last = performance.now();
    // Capture speed and boost at start to prevent mid-animation changes from breaking things
    const fixedSpeed = speed;
    const fixedBoost = boost;
    let animationId = null;
    
    const step = now => {
      if (now - last >= fixedSpeed) {
        const charsPerFrame = (CONFIG.FAST_FORWARD_HOLD && isMouseDown) ? Math.ceil(fixedBoost / 2) : 1;
        el.textContent += txt.substring(i, i + charsPerFrame);
        i += charsPerFrame;
        last = now;
      }
      if (i < txt.length) {
        animationId = requestAnimationFrame(step);
        el._currentAnimation = animationId; // Update current animation ID
      } else {
        el.textContent = txt; // Ensure the full text is displayed
        el._currentAnimation = null; // Clear animation tracking
        resolve();
      }
    };
    
    animationId = requestAnimationFrame(step);
    
    // Store initial animation ID for tracking
    el._currentAnimation = animationId;
  });
};

// Global reference to current waitClick resolver for cleanup
let currentWaitClickResolver = null;
let currentWaitClickCleanup = null;

// Await user interaction (click or Enter key) to continue
export function waitClick() {
  // Clean up any existing waitClick first
  if (currentWaitClickCleanup) {
    currentWaitClickCleanup();
    currentWaitClickCleanup = null;
  }
  
  return new Promise(res => {
    currentWaitClickResolver = res;
    
    function finish(e) {
      if (e.type === "keydown" && e.key !== "Enter") return;
      
      // Only advance dialogue if clicking on valid areas
      if (e.type === "mousedown") {
        const target = e.target;
        const clickableAreas = [
          '#background',
          '#playfield', 
          '#narration',
          '#dialogue',
          '#characters'
        ];
        
        // Check if click is on a valid dialogue-advancing area
        const isValidArea = clickableAreas.some(selector => {
          const element = document.querySelector(selector);
          return element && (target === element || element.contains(target));
        });
        
        // Don't advance if clicking on UI panels, buttons, sidebar, etc.
        const isUIElement = target.closest('#sidebar, #top-icons, #settings-modal, #save-dd, button, input, .icon-btn, .btn');
        
        if (!isValidArea || isUIElement) {
          // Re-add listeners for next click instead of breaking permanently
          addEventListener("mousedown", finish, { once: true });
          addEventListener("keydown", finish, { once: true });
          return; // Don't advance dialogue
        }
      }
      
      cleanup();
      currentWaitClickResolver = null;
      currentWaitClickCleanup = null;
      res();
    }
    
    function cleanup() {
      removeEventListener("mouseup", onRelease);
      removeEventListener("mousedown", finish);
      removeEventListener("keydown", finish);
    }
    
    const onRelease = () => {
      removeEventListener("mouseup", onRelease);
      addEventListener("mousedown", finish, { once: true });
      addEventListener("keydown", finish, { once: true });
    };
    
    // Store cleanup function globally so settings changes can reset if needed
    currentWaitClickCleanup = cleanup;
    
    if (isMouseDown) {
      addEventListener("mouseup", onRelease, { once: true });
    } else {
      addEventListener("mousedown", finish, { once: true });
      addEventListener("keydown", finish, { once: true });
    }
  });
}

// Function to restart waitClick if it gets corrupted by settings changes
export function restartWaitClick() {
  if (currentWaitClickResolver && currentWaitClickCleanup) {
    currentWaitClickCleanup();
    // Re-trigger waitClick
    setTimeout(() => {
      if (currentWaitClickResolver) {
        waitClick().then(currentWaitClickResolver);
      }
    }, 10);
  }
}

// Show or hide the global "Thinking..." overlay
export function thinking(on) {
  // Remove/add hidden class instead of setting display directly
  // The CSS handles the display with opacity transitions
  dom.thinking.classList.toggle("hidden", !on);
  dom.thinking.classList.toggle("visible", on);
  
  // Hide both input forms when thinking
  if (on) {
    dom.inputBar.style.display = "none";
    dom.actionBtns.classList.add("hidden");
  } else {
    // After thinking, decide which input to show based on game state
    updateInputDisplay();
  }
  renderHUD();
}

// Decide whether to show action buttons or the free-text input
export function updateInputDisplay() {
  const textEnabled = state.freeTextUnlocked || state.gameEnded;
  const hasActions = dom.actionBtns.children.length > 0;

  // ── Action Buttons (primary driver) ─────────────
  // If free-text mode is ON, we deliberately hide the pregenerated buttons to
  // avoid UI clutter (per user request). Otherwise show them when available.
  if (hasActions && !state.freeTextUnlocked) {
    dom.actionBtns.style.display = "flex";
    dom.actionBtns.classList.remove("hidden");
    dom.actionBtns.classList.add("show");
  } else {
    dom.actionBtns.style.display = "none";
    dom.actionBtns.classList.add("hidden");
    dom.actionBtns.classList.remove("show");
  }

  // ── Inventory Use Buttons ─────────────────────
  // Show or hide inventory 'Use' buttons in sync with action availability
  dom.invBox?.querySelectorAll('.use-btn').forEach(btn => {
    btn.disabled = !hasActions;
    btn.classList.toggle('hidden', !hasActions);
  });

  // ── Text Input Bar (mirrors buttons) ───────────
  // Show the text input bar whenever free-text mode is enabled (or game ended)
  if (textEnabled) {
    dom.inputBar.style.display = "flex";
    dom.inputBar.classList.add("show");
  } else {
    dom.inputBar.style.display = "none";
    dom.inputBar.classList.remove("show");
  }
}

// Populate and show the action buttons
export function showActionButtons(actions, onAction) {
  // Clear previous buttons
  dom.actionBtns.innerHTML = '';
  // Create and append new buttons
  actions.forEach(actionText => {
    const btn = document.createElement('button');
    btn.className = 'action-btn';
    btn.textContent = actionText;
    btn.onclick = () => {
      onAction(actionText); // Call the provided callback
      dom.actionBtns.classList.add('hidden'); // Hide after click
    };
    dom.actionBtns.appendChild(btn);
  });
  // Show the action buttons with animation
  dom.actionBtns.classList.remove('hidden');
  dom.actionBtns.classList.add('show');
  updateInputDisplay();
}

// Set the speaker name color based on character
export function setNameColor(name) {
  if (name === "You") {
    dom.spkName.style.color = "#7cff7c";
  } else if (name === "Nyx") {
    dom.spkName.style.color = "#ffd76c";
  } else if (name === "Kael") {
    dom.spkName.style.color = "#9feaff";
  } else {
    if (!state.partyColors[name]) {
      state.partyColors[name] = pastel(name);
    }
    dom.spkName.style.color = state.partyColors[name];
  }
}

// Show or hide the notes spinner in HUD
export function notesThinking(on) {
  dom.notesLoader.classList.toggle("hidden", !on);
}

// Input handlers for sending actions
export function bindInputHandlers(onSend) {
  const handleSend = () => {
    if (state.gameEnded) return;
    const userText = dom.userIn.value.trim();
    if (userText) {
      onSend(userText);
      dom.userIn.value = "";
    }
  };
  dom.sendBtn.onclick = handleSend;
  dom.userIn.onkeydown = e => {
    if (state.gameEnded) {
      e.preventDefault();
      return;
    }
    if (e.key === "Enter") {
      const userText = dom.userIn.value.trim();
      if (userText) {
        handleSend();
      } else {
        e.preventDefault();
      }
    }
  };
}

// Note add button handler (add a new blank note)
dom.addNoteBtn.onclick = () => {
  if (!canEditNotes()) return;
  state.notes.push("");
  renderHUD();
  // Focus the newly added note for editing
  const newNoteElem = dom.notesBox.lastElementChild;
  if (newNoteElem) newNoteElem.focus();
};

// Helper: sync party HUD into fixed container when sidebar collapsed
function updateFixedParty() {
  if (!dom.partyFixed) return;
  const collapsed = dom.sidebar.classList.contains("collapsed");
  dom.partyFixed.classList.toggle("hidden", !collapsed);
  if (collapsed) {
    // Clone party list HTML (inside #party-wrap)
    const wrap = document.getElementById("party-wrap");
    if (wrap) dom.partyFixed.innerHTML = wrap.innerHTML;
  } else {
    dom.partyFixed.innerHTML = "";
  }
}

// ── Fullscreen Button Setup ──────────────────────
(function createFullscreen(){
  if (!dom.fullscreenBtn) {
    const btn = document.createElement('button');
    btn.id = 'fullscreen-btn';
    btn.className = 'icon-btn';
    btn.title = 'Toggle Fullscreen';
    btn.innerHTML = '⛶'; // simple icon glyph
    
    // Create a dedicated container for mobile fullscreen button
    let mobileContainer = document.getElementById('mobile-fullscreen-container');
    if (!mobileContainer) {
      mobileContainer = document.createElement('div');
      mobileContainer.id = 'mobile-fullscreen-container';
      mobileContainer.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: var(--z-overlay, 200);
        display: none;
      `;
      document.body.appendChild(mobileContainer);
    }
    
    // Initially add to top-icons for desktop
    document.getElementById('top-icons')?.appendChild(btn);
    dom.fullscreenBtn = btn;
  }
  dom.fullscreenBtn?.addEventListener('click', () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen().catch(console.warn);
    }
  });
  
  // Store reference for fullscreen change handler
  window.updateControlPositions = () => {
    const mobile = window.innerWidth <= CONFIG.MOBILE_BREAKPOINT;
    if (mobile && dom.sidebar.classList.contains('collapsed')) {
      // This will be set by the setupSidebarToggle function
      if (window.moveControlsRef) {
        window.moveControlsRef(true);
      }
    }
  };
  
  // Listen for fullscreen changes to reposition button on mobile
  document.addEventListener('fullscreenchange', window.updateControlPositions);
})();

// Sidebar toggle handler
(function setupSidebarToggle(){
  const moveControls = (toSidebar) => {
    const topIcons = document.getElementById('top-icons');
    const mobileContainer = document.getElementById('mobile-fullscreen-container');
    if (!topIcons) return;
    
    let ctlWrap = document.getElementById('sidebar-controls');
    const mobile = window.innerWidth <= CONFIG.MOBILE_BREAKPOINT;
    const inFullscreen = !!document.fullscreenElement;
    
    // Always keep non-fullscreen buttons in sidebar for cleaner look
    if (!ctlWrap) {
      ctlWrap = document.createElement('div');
      ctlWrap.id = 'sidebar-controls';
      dom.sidebar.appendChild(ctlWrap);
    }
    
    // Always move these buttons to sidebar
    ctlWrap.appendChild(dom.textToggle);
    ctlWrap.appendChild(dom.saveIcon);
    ctlWrap.appendChild(dom.settingsIcon);
    
    // Handle fullscreen button placement
    if (mobile) {
      if (inFullscreen) {
        // In fullscreen: move to sidebar
        ctlWrap.appendChild(dom.fullscreenBtn);
        if (mobileContainer) mobileContainer.style.display = 'none';
      } else {
        // Not in fullscreen: show in dedicated mobile container
        if (mobileContainer) {
          mobileContainer.appendChild(dom.fullscreenBtn);
          mobileContainer.style.display = 'block';
        }
      }
    } else {
      // Desktop: fullscreen button goes to sidebar when sidebar is open, top-icons when closed
      if (toSidebar) {
        ctlWrap.appendChild(dom.fullscreenBtn);
        if (mobileContainer) mobileContainer.style.display = 'none';
      } else {
        topIcons.appendChild(dom.fullscreenBtn);
        if (mobileContainer) mobileContainer.style.display = 'none';
      }
    }
  };

  // Expose moveControls for fullscreen change handler
  window.moveControlsRef = moveControls;

  const handleViewport = () => {
    const mobile = window.innerWidth <= CONFIG.MOBILE_BREAKPOINT;
    if (mobile) {
      dom.sidebar.classList.add("collapsed");
      moveControls(true);
    } else {
      dom.sidebar.classList.remove("collapsed");
      moveControls(false);
    }
    updateFixedParty();
  };
  // Run once on load
  handleViewport();
  // Listen for resize events
  addEventListener("resize", handleViewport);

  if (dom.sidebar && dom.sidebarToggle) {
    
    dom.sidebarToggle.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const collapsed = dom.sidebar.classList.toggle("collapsed");
            updateFixedParty();
      // Force reflow for smooth animation
      void dom.sidebar.offsetWidth;
    });
  }
})();

// Text input toggle handler
(function setupTextToggle(){
  if (dom.textToggle) {
    // Initialize toggle visual and input display based on saved state
    dom.textToggle.classList.toggle("active", state.freeTextUnlocked);
    updateInputDisplay();
    dom.textToggle.addEventListener("click", e => {
      e.stopPropagation();
      state.freeTextUnlocked = !state.freeTextUnlocked;
      dom.textToggle.classList.toggle("active", state.freeTextUnlocked);
      updateInputDisplay();
    });
  }
})();

// Settings panel interactions
(function setupSettingsPanel() {
  const syncLabels = () => {
    dom.valVolume.textContent = `${Math.round(state.userVolume * 100)} %`;
    // Convert ms to speed (higher = faster)
    const speedValue = Math.round(((200 - CONFIG.TEXT_SPEED) / 195) * 100);
    dom.valTextSpeed.textContent = `${speedValue}%`;
  };
  // Initialize sliders, checkbox, and labels
  dom.setVolume.value = Math.round(state.userVolume * 100);
  // Convert TEXT_SPEED (ms) to slider value (higher = faster)
  dom.setTextSpeed.value = Math.round(((200 - CONFIG.TEXT_SPEED) / 195) * 100);
  dom.setCrass.checked = CONFIG.CRASS_DIALOGUE;
  syncLabels();
  // Open/close settings modal
  dom.settingsIcon.addEventListener("click", e => {
    e.preventDefault();
    e.stopPropagation();
    dom.settingsModal.classList.toggle("hidden");
  });
  
  // Close modal when clicking on the overlay background (not its children)
  dom.settingsModal.addEventListener("click", e => {
    // Only close if the click target is the modal overlay itself, not its children
    if (e.target === dom.settingsModal) {
      dom.settingsModal.classList.add("hidden");
    }
  });
  // Live slider bindings
  dom.setVolume.oninput = e => {
    state.userVolume = +e.target.value / 100;
    window.audio.applyVol();
    syncLabels();
  };
  dom.setTextSpeed.oninput = e => {
    // Prevent changes during active dialogue to avoid freezing
    if (isDialogueActive()) {
      // Reset to current slider value (converted from TEXT_SPEED)
      e.target.value = Math.round(((200 - CONFIG.TEXT_SPEED) / 195) * 100);
      return;
    }
    
    const sliderValue = parseInt(e.target.value) || 50; // Default to 50% if parsing fails
    // Convert slider value (0-100, higher = faster) to ms delay (200-5, lower = faster)
    const newSpeed = Math.round(200 - (sliderValue / 100) * 195);
    CONFIG.TEXT_SPEED = Math.max(5, Math.min(200, newSpeed)); // Clamp between 5-200ms
    syncLabels();
    // Restart waitClick to prevent click-to-advance breaking
    restartWaitClick();
  };
  // Crass dialogue checkbox binding
  dom.setCrass.onchange = e => {
    // Prevent changes during active dialogue to avoid freezing
    if (isDialogueActive()) {
      e.target.checked = CONFIG.CRASS_DIALOGUE; // Reset to current value
      return;
    }
    
    CONFIG.CRASS_DIALOGUE = e.target.checked;
    // Restart waitClick to prevent click-to-advance breaking
    restartWaitClick();
  };
})();
