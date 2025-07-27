import { askAI } from './storyAI.js';

// Helper function to safely parse JSON with fallback
function safeParseJSON(jsonString) {
    try {
        // First try to parse as-is
        return JSON.parse(jsonString);
    } catch (e) {
        try {
            // If that fails, try to extract JSON from markdown code blocks
            const jsonMatch = jsonString.match(/```(?:json)?\n([\s\S]*?)\n```/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[1]);
            }
            
            // If no code blocks, try to find an array pattern
            const arrayMatch = jsonString.match(/\[\s*("[^"]*"(?:\s*,\s*"[^"]*")*)?\s*\]/);
            if (arrayMatch) {
                return JSON.parse(arrayMatch[0]);
            }
            
            // If all else fails, return a default action
            console.warn('Could not parse JSON, using fallback actions');
            return ["I continue forward.", "I look around.", "I check my inventory."];
        } catch (innerError) {
            console.warn('Failed to parse JSON with fallback, using default actions');
            return ["I continue forward.", "I look around.", "I check my inventory."];
        }
    }
}

async function getPlayerActions(conversationHistory) {
    // Format the conversation history into a readable string
    const formattedHistory = typeof conversationHistory === 'string' 
        ? conversationHistory 
        : Array.isArray(conversationHistory) 
            ? conversationHistory.map(entry => 
                typeof entry === 'string' ? entry : 
                `${entry.role || 'unknown'}: ${entry.content || ''}`
              ).join('\n\n')
            : String(conversationHistory);

    const prompt = `You are the player character in a role-playing game. The following is the recent conversation history:

${formattedHistory}

Based on this conversation, what are 3 possible actions you could take next?

Phrase the actions in the first-person, as if they were being spoken aloud. Consider the full context of the conversation when suggesting actions.

IMPORTANT: Return ONLY a JSON array of strings. Each string should be a possible action.
Example: ["I should check the chest.", "I should talk to the bartender.", "Nyx, where does that door go?", "Let's search for clues in this room.", "I think we should rest here for a while."]

Your response must be valid JSON. Do not include any other text, explanations, or markdown formatting.`;

    try {
        const response = await askAI([{ role: 'user', content: prompt }], { model: CONFIG.ACTION_MODEL });
        console.log('Raw AI response:', response); // Log raw response for debugging
        
        // Clean up the response and parse it
        const cleanedResponse = response.trim()
            .replace(/^```(?:json)?\n/, '')  // Remove opening code block
            .replace(/\n```$/, '')         // Remove closing code block
            .trim();
            
        const actions = safeParseJSON(cleanedResponse);
        
        // Ensure we return an array
        if (!Array.isArray(actions)) {
            console.warn('Expected array but got:', actions);
            return ["I continue forward.", "I look around.", "I check my inventory."];
        }
        
        // Ensure all actions are strings and not too long
        const processedActions = actions
            .map(action => (typeof action === 'string' ? action : String(action)))
            .filter(action => action.length > 0 && action.length < 100); // Basic validation
            
        // Ensure we have between 2-5 actions
        if (processedActions.length < 2) {
            console.warn('Not enough valid actions, using fallbacks');
            return ["I continue forward.", "I look around.", "I check my inventory."];
        }
        
        return processedActions.slice(0, 5); // Return max 5 actions
    } catch (error) {
        console.error('Error getting player actions:', error);
        return ["I continue forward.", "I look around.", "I check my inventory."];
    }
}

export { getPlayerActions };
