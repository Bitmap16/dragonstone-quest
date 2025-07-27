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
    const step = now => {
      if (now - last >= speed) {
        const charsPerFrame = (CONFIG.FAST_FORWARD_HOLD && isMouseDown) ? Math.ceil(boost / 2) : 1;
        el.textContent += txt.substring(i, i + charsPerFrame);
        i += charsPerFrame;
        last = now;
      }
      if (i < txt.length) {
        requestAnimationFrame(step);
      } else {
        el.textContent = txt; // Ensure the full text is displayed
        resolve();
      }
    };
    requestAnimationFrame(step);
  });
};

// Await user interaction (click or Enter key) to continue
export function waitClick() {
  return new Promise(res => {
    function finish(e) {
      if (isOverlayActive()) return;
      if (e.type === "keydown" && e.key !== "Enter") return;
      cleanup();
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
    if (isMouseDown) {
      addEventListener("mouseup", onRelease, { once: true });
    } else {
      addEventListener("mousedown", finish, { once: true });
      addEventListener("keydown", finish, { once: true });
    }
  });
}

// Show or hide the global "Thinking..." overlay
export function thinking(on) {
  dom.thinking.style.display = on ? "flex" : "none";
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
})();

// Sidebar toggle handler
(function setupSidebarToggle(){
  const moveControls = (toSidebar) => {
    const host = toSidebar ? dom.sidebar : document.getElementById('top-icons');
    if (!host) return;
    let ctlWrap = document.getElementById('sidebar-controls');
    if (toSidebar) {
      if (!ctlWrap) {
        ctlWrap = document.createElement('div');
        ctlWrap.id = 'sidebar-controls';
        dom.sidebar.appendChild(ctlWrap);
      }
      ctlWrap.appendChild(dom.textToggle);
      ctlWrap.appendChild(dom.saveIcon);
      ctlWrap.appendChild(dom.settingsIcon);
      ctlWrap.appendChild(dom.fullscreenBtn);
    } else if (ctlWrap) {
      // Move back to top-icons host in desktop view
      host.appendChild(dom.textToggle);
      host.appendChild(dom.saveIcon);
      host.appendChild(dom.settingsIcon);
      host.appendChild(dom.fullscreenBtn);
      ctlWrap.remove();
    }
  };

  const handleViewport = () => {
    const mobile = window.innerWidth <= 720;
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
    dom.valTextSpeed.textContent = `${CONFIG.TEXT_SPEED} ms`;
  };
  // Initialize sliders and labels
  dom.setVolume.value = Math.round(state.userVolume * 100);
  dom.setTextSpeed.value = CONFIG.TEXT_SPEED;
  syncLabels();
  // Open/close settings modal
  dom.settingsIcon.addEventListener("click", e => {
    e.stopPropagation();
    dom.settingsModal.classList.toggle("hidden");
  });
  addEventListener("click", e => {
    if (
      !dom.settingsModal.classList.contains("hidden") &&
      !dom.settingsModal.contains(e.target) &&
      e.target !== dom.settingsIcon
    ) {
      dom.settingsModal.classList.add("hidden");
    }
  });
  // Live slider bindings
  dom.setVolume.oninput = e => {
    state.userVolume = +e.target.value / 100;
    applyVol();
    syncLabels();
  };
  dom.setTextSpeed.oninput = e => {
    CONFIG.TEXT_SPEED = Math.max(5, e.target.valueAsNumber);
    syncLabels();
  };
})();
