// Test script to list available Gemini models
// Run with: npx ts-node test-models.ts

import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';

const API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';

if (!API_KEY) {
  console.error('❌ No API key found!');
  process.exit(1);
}

console.log('🔍 Testing Gemini API connection...\n');

const ai = new GoogleGenAI({ apiKey: API_KEY });

async function testModels() {
  try {
    // Try different model names
    const models = [
      'models/gemini-pro',
      'models/gemini-1.5-flash',
      'models/gemini-1.5-pro',
      'models/gemini-2.0-flash',
      'gemini-pro',
      'gemini-1.5-flash',
    ];

    for (const model of models) {
      try {
        console.log(`Testing ${model}...`);
        const response = await ai.models.generateContent({
          model,
          config: {
            temperature: 0.3,
            maxOutputTokens: 50,
          },
          contents: [{ role: 'user', parts: [{ text: 'Say "Model works!"' }] }],
        });

        console.log(`✅ ${model} - SUCCESS!\n`);
        console.log(`Response: ${response.text}\n`);
        return;
      } catch (err: any) {
        console.log(`❌ ${model} - Failed: ${err.status || 'Unknown error'}\n`);
      }
    }

    console.error('None of the models worked!');
  } catch (error) {
    console.error('Error:', error);
  }
}

testModels();
