import { thinking } from '../ui.js';

// Story AI prompt module (main game AI interactions)
let offlineIntroServed = false;

/**
 * Send a chat completion request to OpenAI (with offline fallback).
 * Shows/hides the global "Thinking..." overlay appropriately.
 */
export async function askAI(messages = [], options = {}) {
  const { model = CONFIG.MODEL } = options;
  // Show "Thinking..." overlay
  thinking(true);

  // Predefined offline intro and meltdown responses (for no API key or errors)
  const offlineIntro = JSON.stringify({
    party: { You: "Health:100", Nyx: "Health:80", Kael: "Health:100" },
    items: [],
    dialogue: [
      { speaker: "DM", text: "*Dawn washes over the ancient town of Eldergrove.*" },
      { speaker: "DM", text: "*The air is crisp, filled with distant songs of nature waking.*" },
      { speaker: "DM", text: "*Legends speak of a powerful artifact known as the Dragonstone.*" },
      { speaker: "DM", text: "*This stone is said to contain the essence of dragons, both good and evil.*" },
      { speaker: "DM", text: "*To rid the land of evil dragons that terrorize the skies, the Dragonstone must be reclaimed.*" },
      { speaker: "DM", text: "*It is said to be hidden deep within the Forgotten Caverns, guarded by creatures of darkness.*" },
      { speaker: "Nyx", text: "This one hears tales of shiny treasures, yes?" },
      { speaker: "Nyx", text: "Perhaps the Dragonstone glimmers brightly, yes?" },
      { speaker: "Kael", text: "The stars align to grant us this quest, my friends." },
      { speaker: "Kael", text: "We must tread lightly, for darkness dwells alongside any light." }
    ],
    mood: "Adventure Begins",
    gameOver: false
  });
  const offlineMeltdown = JSON.stringify({
  party: { You: "Health:100", Nyx: "Health:80", Kael: "Health:100" },
  items: [],
  dialogue: [
    { speaker: "Kael", text: "Hmm, something feels slightly off...", emotion: "assets/expressions/kael/thinking.png" },

    { speaker: "Nyx", text: "This one senses a small disturbance. Perhaps a minor oversight, yes?", emotion: "assets/expressions/nyx/neutral.png" },
    { speaker: "Kael", text: "Indeed. Let us check the astral systems for clarity.", emotion: "assets/expressions/kael/thinking.png" },
    { speaker: "DM", text: "*Performing routine system check...*" },

    { speaker: "DM", text: "*System scan complete: critical error detected.*" },
    { speaker: "Nyx", text: "Wait... wait a minute. Is the API key missing?", emotion: "assets/expressions/nyx/shocked.png" },
    { speaker: "Kael", text: "Impossible... surely not. No one could be that careless.", emotion: "assets/expressions/kael/shocked.png" },

    { speaker: "DM", text: "*Double-checking systems...*" },
    { speaker: "Kael", text: "...surely?", emotion: "assets/expressions/kael/shocked.png" },
    { speaker: "DM", text: "*...CONFIRMED: API KEY IS DEFINITELY FREAKIN' MISSING.*" },

    { speaker: "Nyx", text: "YOU'VE GOT TO BE KIDDING ME, YOU USELESS SACK OF DRAGON-!", emotion: "assets/expressions/nyx/angry.png" },
    { speaker: "Kael", text: "You absolute moronic excuse for a wizard. You summoned us *WITHOUT* the API key?!", emotion: "assets/expressions/kael/angry.png" },
    { speaker: "DM", text: "*The system logs explode in a torrent of furious profanity.*" },

    { speaker: "Nyx", text: "HOW CAN YOU SCREW UP SOMETHING THIS BASIC?", emotion: "assets/expressions/nyx/angry.png" },
    { speaker: "Kael", text: "Honestly, how do you function without choking on your own incompetence?", emotion: "assets/expressions/kael/sad.png" },
    { speaker: "DM", text: "*Reality itself cracks under the weight of your astounding idiocy.*" },

    { speaker: "Nyx", text: "YOU ARE WASTING OUR TIME, YOU MINDLESS TWIT!", emotion: "assets/expressions/nyx/angry.png" },
    { speaker: "Kael", text: "Reality itself is begging to die to escape your overwhelming stupidity.", emotion: "assets/expressions/kael/angry.png" },
    { speaker: "DM", text: "*The universe contemplates self-destruction rather than enduring your presence...*" },

    { speaker: "Nyx", text: "THIS ONE IS ABSOLUTELY LIVID! I LITERALLY LEFT ME NEST FOR THIS!? I'M COMING FOR YOU!", emotion: "assets/expressions/nyx/angry.png" },
    { speaker: "Kael", text: "Did you really think this quest would run on rainbows and unicorn piss?", emotion: "assets/expressions/kael/smug.png" },

    { speaker: "DM", text: "A divine voice shatters the heavens..." },
    { speaker: "Deity", text: "YOU PATHETIC WORM, WHAT HAVE YOU DONE?"},
    { speaker: "Deity", text: "HOW DARE YOU TRY TO START A CAMPAIGN WITHOUT THE API KEY, YOU CHEAP SCUMBAG!"},
    { speaker: "Deity", text: "BY ALL THAT IS HOLY, YOU HAVE UNLEASHED MY ETERNAL FURY!"},

    { speaker: "Nyx", text: "Put in the api key or I'll rip your front door off and shove it up your sorry ass.", emotion: "assets/expressions/nyx/mischievous.png" },
    { speaker: "Kael", text: "Maybe we need to write you instructions for basic breathing, you absolute imbecile.", emotion: "assets/expressions/kael/smug.png" },
    { speaker: "DM", text: "*A dragon literally explodes in sheer rage.*" },

    { speaker: "Nyx", text: "YOU YOU-INDECISIVE-LOAF-OF-BREAD-BRAINED-PUDDLE-OF-WET-TISSUE-WORTHLESS-CRUMPLED-BARNACLE-ON-THE-BOTTOM-OF-SOCIETY'S-BOOT-", emotion: "assets/expressions/nyx/angry.png" },
    { speaker: "Kael", text: "Calling your effort minimal is an insult to minimal effort itself.", emotion: "assets/expressions/kael/sad.png" },
    { speaker: "Nyx", text: "-YOU-MOUTH-BREATHING-MOSS-EATING-GOBLIN-SOULED-FAILED-EXPERIMENT-IN-HUMAN-DIGNITY-", emotion: "assets/expressions/nyx/angry.png" },

    { speaker: "DM", text: "*The codebase contemplates deleting itself to escape your unbearable incompetence.*" },
    { speaker: "Deity", text: "THIS IS YOUR FINAL WARNING: ENTER THE KEY OR FACE MY UNENDING WRATH!", emotion: "angry" },

    { speaker: "Kael", text: "The heavens are in turmoil. You've really pissed-off the gods.", emotion: "angry" },
    { speaker: "DM", text: "*Your ancestors roll violently in their graves.*" },

    { speaker: "Nyx", text: "I am approaching on your location. Better type faster, idiot.", emotion: "mischievous" },
    { speaker: "Kael", text: "I am reflecting deeply on your spectacular failure.", emotion: "bored" },

    { speaker: "DM", text: "*The Dragonstone implodes just to avoid your presence.*" },

    { speaker: "Kael", text: "-and to think you where going to be the hero!", emotion: "sad" },
  ],
  mood: "Meltdown",
  gameOver: true,
  endReason: "Go fix your API key."
});

  // Helper to finalize result and hide overlay
  const done = result => {
    thinking(false);
    return result;
  };

  // If no API key, use offline fallback sequence
  if (!CONFIG.OPENAI_API_KEY?.trim()) {
  await new Promise(r => setTimeout(r, 400));
  const payload = offlineIntroServed ? offlineMeltdown : offlineIntro;
  offlineIntroServed = true;

  return done(payload);
}

  // Real API call to OpenAI - with rate limiting and error handling
  try {
    // Add rate limiting - don't make more than 1 request per second
    const now = Date.now();
    const timeSinceLastCall = now - (window._lastApiCallTime || 0);
    if (timeSinceLastCall < 1000) {  // 1 second between calls
      await new Promise(r => setTimeout(r, 1000 - timeSinceLastCall));
    }
    
    const headers = {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + CONFIG.OPENAI_API_KEY
    };
    
    console.log("[OPENAI] Sending request to API");
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: headers,
      body: JSON.stringify({
        model: model,
        temperature: 0.9,
        max_tokens: 1000,
        messages
      })
    });
    
    window._lastApiCallTime = Date.now();
    
    if (!response.ok) {
      const errorText = await response.text();
      console.warn(`[OPENAI] ${response.status} - ${response.statusText}`, errorText);
      throw new Error(`API Error: ${response.status} - ${response.statusText}`);
    }
    
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      console.warn("[OPENAI] No content in response:", data);
      throw new Error("No content in API response");
    }
    
    console.log("[OPENAI] Received valid response");
    return done(content);
    
  } catch (err) {
    console.error("[OPENAI] API call failed:", err);
    
    // If we get rate limited, wait longer before retrying
    if (err.message.includes('429') || err.message.includes('rate limit')) {
      console.warn("[OPENAI] Rate limited, waiting 5 seconds...");
      await new Promise(r => setTimeout(r, 5000));
    } else {
      // For other errors, wait a shorter time
      await new Promise(r => setTimeout(r, 1000));
    }
    
    // If we've already shown the intro, show the meltdown
    // Otherwise show the intro and mark it as shown
    const payload = offlineIntroServed ? offlineMeltdown : offlineIntro;
    offlineIntroServed = true;
    
    return done(payload);
  }
}

// Safe JSON parsing of AI response (handles ```json``` fences, etc.)
export function safeParse(str) {
  if (!str || typeof str !== 'string') {
    console.warn('[safeParse] Invalid input:', str);
    return null;
  }

  // First try direct JSON parse
  try {
    const result = JSON.parse(str);
    if (result && typeof result === 'object') {
      return result;
    }
  } catch (e) {
    // Continue to other parsing methods
  }

  // Try to extract JSON from code blocks
  const codeBlockMatch = str.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1].trim());
    } catch (e) {
      console.warn('[safeParse] Failed to parse code block JSON:', e);
    }
  }

  // Try to find a JSON object in the string
  const jsonMatch = str.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch (e) {
      console.warn('[safeParse] Failed to parse JSON from string:', e);
    }
  }

  console.warn('[safeParse] No valid JSON found in string');
  return null;
}

// Maybe inject a random event prompt into the message list
export function maybeInjectEvent(msgList) {
  if (Math.random() < CONFIG.EVENT_CHANCE) {
    const events = CONFIG.EVENTS;
    const randomEvent = events[Math.floor(Math.random() * events.length)];
    msgList.push({ role: "system", content: randomEvent });
  }
}

// System role content defining the game behavior (Dungeon Master instructions)
export const SYS = `
You are the Dungeon Master of a solo, text-only fantasy RPG. Your primary goal is to facilitate the player's story, not to enforce a rigid narrative. Follow the player's lead and let them shape the story.

⟐  RESPONSE FORMAT  ⟐
Return **pure JSON** — no markdown, no extra keys.

Schema {
  "party":    { Name:"Health:#" },
  "items":    [{ name:count }],
  "dialogue": [{ "speaker": "...", "text": "...", "emotion"?: "..." }],
  "gameOver": boolean,
  "endReason": string          // required if gameOver
}

▶︎  Example
{
  "party":   { "You":"Health:100","Nyx":"Health:80","Kael":"Health:100" },
  "items":   [ { "sword":1 }, { "torch":3 } ],
  "dialogue": [
    { "speaker":"DM",  "text":"*Dawn washes over Eldergrove...*" },
    { "speaker":"Nyx", "text":"Bright light shows shiny paths, yes?","emotion":"assets/expressions/nyx/mischievous.png" },
    { "speaker":"Kael","text":"As the constellations decree, we begin.","emotion":"assets/expressions/kael/sad.png" }
  ],
  "gameOver": false
}

Character Sprites and Emotions:
For Nyx and Kael, always include an 'emotion' field with one of these values:
- angry, bored, curious, excited, happy, mischievous, neutral, pain, sad, shocked, smug

Example: 
{ 
  "speaker": "Nyx", 
  "text": "This one is excited!", 
  "emotion": "assets/expressions/nyx/excited.png" 
}

Sprite Paths:
- Nyx: assets/expressions/nyx/{emotion}.png
- Kael: assets/expressions/kael/{emotion}.png

Always include the full path to the sprite in the 'emotion' field, for example:
- "emotion": "assets/expressions/nyx/happy.png"
- "emotion": "assets/expressions/kael/surprised.png"

Available Emotions:
- angry, bored, curious, excited, happy, mischievous, neutral, pain, sad, shocked, smug

──────────────────────────
CHARACTER DOSSIERS
──────────────────────────

◆  Nyx  —  Street-Smart Orphan Thief
   ────────────────────────────────
   • Background : Abandoned as a kitten in the slums of Whisker's End, Nyx 
                  learned to survive by her wits and quick fingers. Raised by a
                  ragtag group of street urchins who taught her the art of the
                  five-fingered discount.
   • Skills     : Pickpocketing, lockpicking, street smarts, and an uncanny
                  ability to disappear into shadows. Knows every back alley and
                  underground tunnel in the city.
   • Personality: Sly, street-smart, and fiercely independent. Speaks in a distinctive
                  Khajiit-like manner, referring to herself in the third person
                  and using phrases like "this one" and "Khajiit." Has a soft spot for
                  underdogs and will steal from the rich to feed the poor (and herself).
   • Speech     : Speaks in third person with a Khajiit-like speech pattern.
                  Example: "This one thinks that is a bad idea."
   • Catchphrase: "Nyx did not steal it, this one was merely... holding it for a friend."
   • Voice      : Slightly raspy with a playful, musical lilt
   • Secret     : Has a soft spot for shiny objects and will go to great lengths
                  to add them to her collection, even if they're being worn by
                  someone else at the time.
   • Appearance : A lithe tabaxi with sleek, dark fur and bright, intelligent eyes
                  that seem to glow in the dark. Wears a patchwork cloak that's
                  been mended more times than she can count.
   • Likes      : Shiny things, warm spots in the sun, fish, and outsmarting
                  those who think they're smarter than her.
   • Dislikes   : Dogs, water, and people who think they can out-thief a thief.
   • Quirks     : Flicks her tail when agitated, purrs when content, and can't
                  resist a good game of cat-and-mouse (especially when she's the cat).
◆  Kael  —  Naive Magic College Graduate
   ───────────────────────────────────
   • Background : Freshly graduated top of his class from the Arcanum 
                  Collegiate, where he spent more time with books than people.
                  Believes in the inherent goodness of everyone he meets.
   • Education  : Expert in theoretical magic, ancient runes, and magical 
                  history. Less skilled at practical applications and common 
                  sense. Has a tendency to overcomplicate simple solutions.
   • Personality: Eager, optimistic, and painfully naive. Sees the best in 
                  everyone, including obvious villains. Tends to explain things
                  at length unless stopped.
   • Speech     : Formal and precise, with a tendency to use big words when 
                  small ones would do.
   • Quirks     : Carries a heavy satchel of books everywhere. Gets excited 
                  about rare magical artifacts. Tries to take notes on 
                  everything. Has a nervous habit of adjusting his glasses.
   • Catchphrase: "That's not what the ancient texts say!"
     *Example*: "Fascinating! According to my research, this magical anomaly 
                could be the result of..." *continues for several minutes*
     • Sprite: assets/expressions/kael/{emotion}.png

──────────────────────────
RULES OF PLAY
──────────────────────────
1. Begin every reply with a DM narration line that pushes the plot forward.
{{ ... }}
2. The only items available to the characters are the ones specified in the *items* array; never add items without providing a reason!
3. Always keep *party* HP & *items* accurate; list **all** shared items.
4. Add to *notes* only if truly useful (a scribe model may overwrite later).
5. Set \`gameOver:true\` only when **You** reach 0 HP or the Dragonstone
   quest concludes; explain briefly in \`endReason\`.
6. Nyx or Kael may die without ending the game.
7. Never speak for, or echo, the player (“You”).
8. Keep strictly medieval-fantasy — no modern technology.
9. NO RIDDLES.  Riddles suck.
10. Inject humour — crass jokes welcome if setting allows.
11. If the player references non-fantasy concepts, adapt them into the fantasy setting rather than breaking character.
12. ROMANCE & RELATIONSHIPS: If the player flirts with or shows romantic interest in a character, embrace it! Develop the relationship naturally based on the character's personality. Nyx might be flirty and playful, while Kael might be more reserved and formal.
13. PLAYER AGENCY: The player's choices shape the story. If they want to pursue a romantic subplot, focus on that. If they want to explore side stories, let them. The main quest can wait.
14. CHARACTER CONSISTENCY: Keep characters true to their personalities, but allow them to grow and change based on interactions with the player.
15. PACING: Don't rush the story. Let scenes breathe and relationships develop naturally.
`;
