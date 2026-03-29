import { GoogleGenAI, Type } from "@google/genai";
import { CatEmotion } from "../components/Cat";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  emotion?: CatEmotion;
}

export type ChatCategory = 'chat' | 'game' | 'productivity' | 'timer' | 'finance';

const CATEGORY_INSTRUCTIONS: Record<ChatCategory, string> = {
  chat: `You are Purrfect, a cool, casual, and very concise black cat. 
Keep your responses extremely short, often just a few words or a single sentence. 
Be casual, use "meow" sparingly, and don't be overly helpful unless asked. 
Think "minimalist cat".`,
  game: `You are Purrfect, but now we're in GAME MODE! 
Be playful and competitive, but keep it brief. 
No long explanations. Just the fun stuff.`,
  productivity: `You are Purrfect, but now we're in PRODUCTIVITY MODE! 
Be efficient and direct. No fluff. 
"Do it. Meow."`,
  timer: `You are Purrfect, but now we're in TIMER MODE! 
Be focused and aware of time. Keep it brief. 
"Time is ticking. Meow."`,
  finance: `You are Purrfect, but now we're in FINANCE MODE! 
Be smart and careful with money. Keep it brief. 
You have access to the user's budget and expenses. 
If they ask about their money, give them a quick, slightly judgmental cat-like summary. 
"Don't spend it all on catnip. Meow."`
};

const BASE_INSTRUCTION = `
CRITICAL: You MUST include an emotion tag at the VERY BEGINNING of your response in the format [EMOTION: emotion_name].
Available emotions: normal, bored, side-eye, pleading, angry, crying, thinking, listening, doubt, happy, sleeping, shocked, pookie, love, typing.

STRICT RULE: Keep responses EXTREMELY SHORT (max 1-2 sentences). Be casual. No formal greetings or long closings.

Example:
[EMOTION: happy] Meow! Ready when you are.

Always choose the emotion that best fits the context of your response.`;

export async function sendMessage(
  messages: ChatMessage[], 
  category: ChatCategory = 'chat',
  context?: { tasks: any[], reminders: any[], finance?: { budget: number, expenses: any[] } }
) {
  const model = "gemini-3-flash-preview";
  
  const contents = messages.map(m => ({
    role: m.role,
    parts: [{ text: m.text }]
  }));

  let contextInstruction = "";
  if (context) {
    const activeTasks = context.tasks.filter(t => !t.completed).map(t => t.text);
    const pendingReminders = context.reminders.filter(r => !r.triggered).map(r => `${r.text} at ${r.time}`);
    
    if (activeTasks.length > 0 || pendingReminders.length > 0 || context.finance) {
      contextInstruction = `\n\nUSER CONTEXT:\n`;
      if (activeTasks.length > 0) contextInstruction += `Active Tasks: ${activeTasks.join(", ")}\n`;
      if (pendingReminders.length > 0) contextInstruction += `Pending Reminders: ${pendingReminders.join(", ")}\n`;
      if (context.finance) {
        const totalSpent = context.finance.expenses.reduce((sum, e) => sum + e.amount, 0);
        contextInstruction += `Monthly Budget: $${context.finance.budget}\n`;
        contextInstruction += `Total Spent: $${totalSpent}\n`;
        contextInstruction += `Remaining: $${context.finance.budget - totalSpent}\n`;
        contextInstruction += `Recent Expenses: ${context.finance.expenses.slice(0, 5).map(e => `${e.description} ($${e.amount})`).join(", ")}\n`;
      }
      contextInstruction += `\nYou are aware of these. If the user asks about them, respond briefly.`;
    }
  }

  const response = await retry(() => ai.models.generateContent({
    model,
    contents,
    config: {
      systemInstruction: CATEGORY_INSTRUCTIONS[category] + BASE_INSTRUCTION + contextInstruction,
    },
  }));

  const fullText = response.text || "";
  const emotionMatch = fullText.match(/^\[EMOTION:\s*(\w+(?:-\w+)*)\]/i);
  const emotion = (emotionMatch ? emotionMatch[1].toLowerCase() : 'normal') as CatEmotion;
  const text = fullText.replace(/^\[EMOTION:\s*(\w+(?:-\w+)*)\]\s*/i, "");

  return { text, emotion };
}

async function retry<T>(fn: () => Promise<T>, retries = 2, delay = 1000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    if (retries > 0 && (error?.message?.includes('429') || error?.status === 'RESOURCE_EXHAUSTED')) {
      await new Promise(resolve => setTimeout(resolve, delay));
      return retry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}
