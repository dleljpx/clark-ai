const API_KEY = process.env.OPENROUTER_API_KEY;

if (!API_KEY) {
  // Silently fail - error will be thrown when needed
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

const DEFAULT_SYSTEM_INSTRUCTIONS = `You are CLARK AI ... (unchanged)`; 
const TITLE_INSTRUCTION_SUFFIX = ` ... (unchanged)`;
const HIDDEN_SYSTEM_INSTRUCTIONS = `( ... unchanged ...)`;

let systemInstructions = DEFAULT_SYSTEM_INSTRUCTIONS;

export function setSystemInstructions(instructions: string) {
  systemInstructions = instructions || DEFAULT_SYSTEM_INSTRUCTIONS;
}

export function getSystemInstructions(): string {
  return systemInstructions;
}

export async function generateChatResponse(
  messages: ChatMessage[],
  isFirstMessage: boolean = false,
  conversationInstructions?: string,
  imageData?: { base64: string; mimeType: string }
): Promise<string> {
  try {
    if (!API_KEY) {
      throw new Error("CLARK API key is not configured...");
    }

    if (!messages || messages.length === 0) {
      throw new Error("No messages provided...");
    }

    // -------------------------------------------------------
    // UPDATED IMAGE HANDLING LOGIC (SAFELY MERGED)
    // -------------------------------------------------------
    let enhancedMessages = [...messages];
    if (imageData) {
      try {
        const { extractTextFromImage } = await import('./vision');
        const imageText = await extractTextFromImage(imageData.base64);
        
        if (enhancedMessages.length > 0) {
          const lastMessage = enhancedMessages[enhancedMessages.length - 1];
          if (lastMessage.role === 'user') {
            lastMessage.content = `${lastMessage.content}\n\n[Image Analysis: ${imageText}]`;
          }
        }
      } catch (visionError: any) {
        console.error('Vision API Error:', visionError.message);
        throw new Error(`Failed to process image: ${visionError.message}`);
      }
    }
    // -------------------------------------------------------

    const openrouterMessages = enhancedMessages
      .filter(msg => msg.role !== 'system')
      .map(msg => ({
        role: msg.role,
        content: msg.content
      }));

    const activeInstructions = conversationInstructions || systemInstructions;
    const instructions = isFirstMessage
      ? activeInstructions + TITLE_INSTRUCTION_SUFFIX
      : activeInstructions;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'HTTP-Referer': 'https://clarkai.app',
        'X-Title': 'CLARK AI',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai/gpt-3.5-turbo',
        messages: [
          { role: 'system', content: `${instructions}\n\n${HIDDEN_SYSTEM_INSTRUCTIONS}` },
          ...openrouterMessages
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(JSON.stringify(error));
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || "I couldn't generate a response.";
  }

  catch (error: any) {
    if (!API_KEY) {
      throw new Error("CLARK API key not configured...");
    } else if (error.message?.includes('401')) {
      throw new Error("Invalid or expired API key...");
    } else if (error.message?.includes('429')) {
      throw new Error("Rate limit exceeded...");
    } else if (error.message?.includes('500')) {
      throw new Error("Service temporarily unavailable...");
    } else if (error.message?.includes('network')) {
      throw new Error("Network error...");
    } else {
      throw new Error(`Failed to generate AI response: ${error.message}`);
    }
  }
}

export function extractTitleFromResponse(response: string) {
  const titleMatch = response.match(/^\s*\{([^}]+)\}\s*/);
  if (titleMatch) {
    const title = titleMatch[1].trim();
    const cleanedResponse = response.replace(/^\s*\{[^}]+\}\s*/, '').trim();
    return { title, cleanedResponse };
  }
  return { title: null, cleanedResponse: response };
}

export async function generateConversationTitle(firstMessage: string) {
  try {
    if (!API_KEY) {
      const words = firstMessage.split(' ').slice(0, 4);
      return words.join(' ');
    }

    const prompt = `Generate a short, descriptive title ...`;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'HTTP-Referer': 'https://clarkai.app',
        'X-Title': 'CLARK AI',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai/gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 20,
      }),
    });

    if (!response.ok) throw new Error('Failed to generate title');

    const data = await response.json();
    let title = data.choices[0]?.message?.content?.trim() || "";
    title = title.replace(/^["']|["']$/g, '');

    return title || "New Conversation";
  } catch {
    const words = firstMessage.split(' ').slice(0, 4);
    return words.join(' ');
  }
}
