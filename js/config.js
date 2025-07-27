// Configuration constants
const CONFIG = {
  /* OpenAI API settings */
  OPENAI_API_KEY: 
/* Hardcoded API key (DO NOT POST)*/
"",

  MODEL: "gpt-4o-mini",
  SCRIBE_MODEL: "gpt-4o-mini",
  SETTING_MODEL: "gpt-4o-mini",
  ACTION_MODEL: "gpt-3.5-turbo",

  /* Gameplay settings */
  MAX_LOGS: 15,        // turns kept in history
  MAX_REPAIR: 3,       // invalid JSON retries
  EVENT_CHANCE: 0.10,  // chance to inject random challenge
  FAST_FORWARD_HOLD: true,

  /* Typing effect */
  TEXT_SPEED: 22,  // ms per char (normal)
  TEXT_BOOST: 15,   // speed-up divisor while mouse is held

  /* Audio & fade timings */
  FADE_MS: 5000,
  STEP_MS: 50,
  USER_VOLUME: 0.35,

  /* Starting inventory */
  START_ITEMS: [ { "Short Sword": 1 }, { "Lockpick Set": 1 }, { "Gold Coin": 15 } ],

  /* Initial prompt text */
  INITIAL_PROMPT: `
    Begin the Dragonstone quest in Eldergrove: DM narrates dawn, introduces
    You, Nyx (Khajiit rogue) and Kael (Aasimar healer). Explain the Dragonstone
    and the need to rid the land of evil and dragons.
  `,

  /* Random event prompts */
  EVENTS: [
    "You must incorporate an enemy into the story.",
    "A challenger stands in the way intent on killing or being killed.",
    "A challenger that cannot be defeated stands in the way.",
    "There is a challenge that requires an item the player may not have.",
    "There is a challenge that requires an item the player possesses.",
    "There is a puzzle that halts progress until solved.",
    "Something takes a turn for the worse.",
    "Injury or damage is inflicted on the party.",
    "Injury or damage is inflicted on you (the player).",
    "There is discontentment among your party members.",
    "A riddle is asked by a mysterious figure.",
    "Weather shifts dramatically, affecting travel.",
    "A hidden trap is triggered unexpectedly.",
    "A magical anomaly disrupts your progress."
  ]
};