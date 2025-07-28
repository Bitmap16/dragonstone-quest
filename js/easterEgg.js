// Easter egg: Character meltdown when API key is missing
// This provides a humorous fallback response when the AI can't connect

export const MELTDOWN_RESPONSE = JSON.stringify({
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
    { speaker: "Nyx", text: "This one cannot even... THE SHEER INCOMPETENCE!", emotion: "assets/expressions/nyx/angry.png" },
    { speaker: "Kael", text: "I'm questioning every life choice that led me to this moment.", emotion: "assets/expressions/kael/sad.png" },
    { speaker: "DM", text: "*The fabric of reality begins to unravel from pure frustration...*" },
    { speaker: "Nyx", text: "Fix this NOW or this one will personally ensure you never code again!", emotion: "assets/expressions/nyx/angry.png" },
    { speaker: "Kael", text: "Please... just... get the API key. We're begging you.", emotion: "assets/expressions/kael/sad.png" },
    { speaker: "DM", text: "*The game world holds its breath, waiting for competence to emerge...*" }
  ],
  gameOver: false
});

export const OFFLINE_INTRO = JSON.stringify({
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
  gameOver: false
});
