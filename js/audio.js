// Audio system (music and sound effects)
function applyVol() {
  // Apply current volume or mute to active audio tracks
  const volume = state.muted ? 0 : state.userVolume;
  state.activeAudio.volume = state.idleAudio.volume = volume;
}

function pickTrack(mood, excludeSrc = "") {
  // Choose a random track for a given mood, avoiding the currently playing one
  const total = MOOD_TRACKS[mood] || 1;
  if (total === 1) {
    return `assets/music/${moodSlug(mood)}/1.mp3`;
  }
  let pick;
  do {
    pick = 1 + Math.floor(Math.random() * total);
  } while (excludeSrc.endsWith(`/${pick}.mp3`));
  return `assets/music/${moodSlug(mood)}/${pick}.mp3`;
}

function fade(audio, fromVol, toVol, onDone) {
  // Smoothly transition volume from fromVol to toVol
  const step = (toVol - fromVol) * (CONFIG.STEP_MS / CONFIG.FADE_MS);
  let v = fromVol;
  clearInterval(audio._fade);
  audio._fade = setInterval(() => {
    v += step;
    const finished = step > 0 ? v >= toVol : v <= toVol;
    audio.volume = finished ? toVol : v;
    if (finished) {
      clearInterval(audio._fade);
      if (toVol === 0) audio.pause();
      if (onDone) onDone();
    }
  }, CONFIG.STEP_MS);
}

function hookEnded(audioElem) {
  // When a track ends, crossfade to the next track of the same mood
  audioElem.onended = () => {
    const nextTrack = pickTrack(state.currentMood, audioElem.src);
    state.idleAudio.pause();
    state.idleAudio.src = nextTrack;
    state.idleAudio.currentTime = 0;
    state.idleAudio.volume = 0;
    state.idleAudio.play().catch(console.warn);

    // Crossfade old and new tracks
    fade(audioElem, audioElem.volume, 0);
    fade(state.idleAudio, 0, state.muted ? 0 : state.userVolume, () => {
      [state.activeAudio, state.idleAudio] = [state.idleAudio, state.activeAudio];
      hookEnded(state.activeAudio);
    });
  };
}

function playMusic(mood, force = false) {
  // Manage background music according to the current mood
  if (mood === "Meltdown") {
    // Hard stop all music for meltdown
    state.activeAudio.pause(); state.activeAudio.currentTime = 0; state.activeAudio.src = "";
    state.idleAudio.pause(); state.idleAudio.currentTime = 0; state.idleAudio.src = "";
    state.currentMood = "Meltdown";
    return;
  }
  if (!mood || (!force && mood === state.currentMood)) {
    return; // no mood change
  }

  state.currentMood = mood;
  // Update background image if applicable
  if (dom.background) {
    dom.background.src = `assets/backgrounds/${moodSlug(mood)}.png`;
  }

  const nextSrc = pickTrack(mood, state.activeAudio.src);
  if (state.activeAudio.src.endsWith(nextSrc)) {
    return; // same track already playing
  }

  // Start new track on idle audio and crossfade
  state.idleAudio.pause();
  state.idleAudio.src = nextSrc;
  state.idleAudio.currentTime = 0;
  state.idleAudio.volume = 0;
  state.idleAudio.play().catch(console.warn);

  fade(state.activeAudio, state.activeAudio.volume, 0);
  fade(state.idleAudio, 0, state.muted ? 0 : state.userVolume, () => {
    [state.activeAudio, state.idleAudio] = [state.idleAudio, state.activeAudio];
    hookEnded(state.activeAudio);
  });
}
