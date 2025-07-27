// Audio system (music and sound effects)
function applyVol() {
  // Apply current volume or mute to active audio tracks
  const volume = state.muted ? 0 : state.userVolume;
  state.activeAudio.volume = state.idleAudio.volume = volume;
}

// Load music manifest
let MUSIC_MANIFEST = {};
let musicManifestLoaded = false;

// Expose public functions
window.audio = {
  playMusic,
  applyVol,
  loadMusicManifest,
  pickTrack,
  validateMood
};

// Function to load the music manifest
async function loadMusicManifest() {
  if (musicManifestLoaded) return;
  try {
    const response = await fetch('music-manifest.json');
    MUSIC_MANIFEST = await response.json();
    musicManifestLoaded = true;
    console.log('[audio] Music manifest loaded successfully');
  } catch (error) {
    console.warn('[audio] Failed to load music manifest, using empty manifest:', error);
    MUSIC_MANIFEST = {};
  }
}

// Load the manifest when the module is initialized
loadMusicManifest();

// Function to validate and normalize mood names
function validateMood(mood, setting = null) {
  // Force lowercase to prevent errors with AI capitalization
  const normalizedMood = mood.toLowerCase();
  
  // Get available moods from the manifest
  const availableMoods = Object.keys(MUSIC_MANIFEST);
  
  console.log(`[audio] validateMood: Checking mood '${normalizedMood}'`);
  console.log(`[audio] validateMood: Mood is valid:`, availableMoods.includes(normalizedMood));
  
  if (availableMoods.includes(normalizedMood)) {
    console.log(`%c[audio] %cMood validated: %c${normalizedMood}`, 'color: #9c27b0; font-weight: bold', 'color: #4caf50', 'color: #2196f3');
    return normalizedMood;
  } else {
    console.warn(`[audio] Invalid mood: ${normalizedMood}. Falling back to 'narrative/foreboding'.`);
    return 'narrative/foreboding';
  }
}

function pickTrack(mood, excludeSrc = "") {
  // Check if the mood exists in our MUSIC_MANIFEST
  if (!MUSIC_MANIFEST[mood]) {
    console.warn(`No tracks found for mood: ${mood}`);
    return "";
  }
  
  const tracks = MUSIC_MANIFEST[mood];
  let availableTracks = [...tracks];
  
  // If we have an excludeSrc, filter it out
  if (excludeSrc) {
    const baseExclude = excludeSrc.split('/').pop(); // Get just the filename
    availableTracks = tracks.filter(track => !track.endsWith(baseExclude));
  }
  
  // If we filtered out all tracks, use the full list
  if (availableTracks.length === 0) {
    availableTracks = [...tracks];
    console.log(`[audio] No alternative tracks found, reusing all tracks for mood: ${mood}`);
  }
  
  // Pick a random track
  const pick = Math.floor(Math.random() * availableTracks.length);
  const selectedTrack = availableTracks[pick];
  
  // Log the available tracks for debugging
  console.log(`[audio] Available tracks for '${mood}':`, tracks);
  console.log(`[audio] Selected track: ${selectedTrack}`);
  
  // Make sure the path is correct - prepend 'music/' if needed
  const fullPath = selectedTrack.startsWith('music/') ? selectedTrack : `music/${selectedTrack}`;
  console.log(`[audio] Full path to audio file: ${fullPath}`);
  
  return fullPath;
}

// Update browser/OS media session metadata for now-playing integrations
function updateMediaSession(src) {
  if (!('mediaSession' in navigator)) return;
  const fileEncoded = src.split('/').pop();
  const file = decodeURIComponent(fileEncoded);
  const nameParts = file.replace(/\.(mp3|ogg|wav)$/i, '').split(' - ');
  const title = nameParts[0] || file;
  const artist = nameParts[1] || '';
  navigator.mediaSession.metadata = new MediaMetadata({
    title,
    artist,
    album: 'Dragonstone Quest',
    artwork: [] // Could be populated if cover art exists
  });
}

// Display toast notification with current song
function showTrackToast(src) {
  updateMediaSession(src);
  const toast = document.getElementById('toast');
  if (!toast) return;
  const fileEncoded = src.split('/').pop();
  const file = decodeURIComponent(fileEncoded);
  const nameParts = file.replace(/\.(mp3|ogg|wav)$/i, '').split(' - ');
  const title = nameParts[0] || file;
  const author = nameParts[1] || '';
  toast.textContent = `♪ ${title}${author ? ' – ' + author : ''}`;
  toast.classList.remove('hidden');
  toast.classList.add('show');
  clearTimeout(showTrackToast._timer);
  showTrackToast._timer = setTimeout(() => {
    toast.classList.remove('show');
    // wait for css transition
    setTimeout(() => toast.classList.add('hidden'), 400);
  }, 4000);
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
  // Ensure media session is updated whenever track ends and new track begins
  updateMediaSession(audioElem.src);
  // When a track ends, crossfade to the next track of the same mood
  audioElem.onended = () => {
    const nextTrack = pickTrack(state.currentMood, audioElem.src);
    if (!nextTrack) {
      console.warn('No track found for mood:', state.currentMood);
      return;
    }
    state.idleAudio.pause();
    state.idleAudio.src = nextTrack;
    state.idleAudio.currentTime = 0;
    state.idleAudio.volume = 0;
    state.idleAudio.play().then(() => showTrackToast(nextTrack)).catch(console.warn);

    // Crossfade old and new tracks
    fade(audioElem, audioElem.volume, 0);
    fade(state.idleAudio, 0, state.muted ? 0 : state.userVolume, () => {
      [state.activeAudio, state.idleAudio] = [state.idleAudio, state.activeAudio];
      hookEnded(state.activeAudio);
    });
  };
}

/**
 * Play music for the specified mood
 * @param {string} mood - The mood to play music for
 * @param {boolean} [force=false] - Force playback even if the mood hasn't changed
 * @returns {Promise<void>}
 */
async function playMusic(mood, force = false) {
  try {
    // Ensure manifest is loaded
    await loadMusicManifest();
    
    // Validate input
    if (typeof mood !== 'string' || !mood.trim()) {
      console.warn('[audio] playMusic called with invalid mood:', mood);
      return;
    }
    
    console.log(`[audio] playMusic called with mood: '${mood}'`);
    
    // Special case for Meltdown mode
    if (mood === "Meltdown") {
      console.log('[audio] Entering Meltdown mode - stopping all music');
      stopAllAudio();
      state.currentMood = "Meltdown";
      return;
    }
    
    // Validate the mood
    const validatedMood = validateMood(mood);
    if (validatedMood !== mood) {
      console.log(`[audio] Mood normalized from '${mood}' to '${validatedMood}'`);
      mood = validatedMood;
    }
    
    // Check for no-op conditions
    if (!mood) {
      console.warn('[audio] No valid mood provided');
      return;
    }
    
    if (!force && mood === state.currentMood) {
      console.log(`[audio] Already playing music for mood: '${mood}'`);
      return;
    }

    state.currentMood = mood;
    
    // Rest of the playMusic function...
    const nextSrc = pickTrack(mood, state.activeAudio.src);
    if (!nextSrc) {
      console.error(`[audio] No tracks found for mood: '${mood}'`);
      return;
    }
    
    console.log(`[audio] Selected track: ${nextSrc}`);
    
    // Set up the next track on the idle audio element
    state.idleAudio.src = nextSrc;
    state.idleAudio.volume = 0;
    
    // Play the new track
    try {
      await state.idleAudio.play();
    showTrackToast(nextSrc);
    updateMediaSession(nextSrc);
      console.log(`[audio] Successfully started playing: ${nextSrc}`);
    } catch (error) {
      console.error(`[audio] Failed to play audio:`, error);
      return;
    }
    
    // Crossfade between tracks
    fade(state.activeAudio, state.activeAudio.volume, 0);
    fade(state.idleAudio, 0, state.muted ? 0 : state.userVolume, () => {
      // Swap active and idle audio elements
      [state.activeAudio, state.idleAudio] = [state.idleAudio, state.activeAudio];
      hookEnded(state.activeAudio);
    });
  } catch (error) {
    console.error('[audio] Error in playMusic:', error);
  }
}

/**
 * Stop all audio playback and clean up
 */
function stopAllAudio() {
  state.activeAudio.pause();
  state.activeAudio.currentTime = 0;
  state.activeAudio.src = "";
  
  state.idleAudio.pause();
  state.idleAudio.currentTime = 0;
  state.idleAudio.src = "";
  
  console.log('[audio] All audio stopped');

  
}
