/**
 * src/lib/llm/gemini.js
 * Official Google Gen AI SDK wrapper for Tarseekh AI.
 * Server-code ONLY. Never expose API keys or call from the browser.
 */

import { GoogleGenAI } from '@google/genai';

function getClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY belum dikonfigurasi. Silakan tambahkan ke .env.local untuk mengaktifkan Tanya AI.'
    );
  }
  return new GoogleGenAI({ apiKey });
}

/**
 * Streams content generation using Gemini.
 *
 * @param {object} params
 * @param {string} params.prompt
 * @param {string} [params.systemInstruction]
 * @param {Array<object>} [params.history]
 * @param {string} [params.model]
 * @returns {Promise<AsyncGenerator<string>>}
 */
export async function* generateStream({
  prompt,
  systemInstruction,
  history = [],
  model = process.env.GEMINI_MODEL || 'gemini-2.5-flash',
}) {
  const ai = getClient();

  const contents = [];

  // Format past history turns
  for (const h of history) {
    contents.push({
      role: h.role === 'user' ? 'user' : 'model',
      parts: [{ text: h.content || '' }],
    });
  }

  // Append latest user turn
  contents.push({
    role: 'user',
    parts: [{ text: prompt }],
  });

  try {
    const config = {};
    if (systemInstruction) {
      config.systemInstruction = systemInstruction;
    }

    const responseStream = await ai.models.generateContentStream({
      model,
      contents,
      config,
    });

    for await (const chunk of responseStream) {
      if (chunk.text) {
        yield chunk.text;
      }
    }
  } catch (err) {
    // Map rate limit error (429) to friendly Indonesian message
    const msg = String(err?.message || '');
    if (msg.includes('429') || msg.toLowerCase().includes('quota') || msg.toLowerCase().includes('rate limit')) {
      throw new Error(
        'Batas permintaan AI sedang ramai atau kuota habis. Silakan tunggu beberapa saat dan coba kembali.'
      );
    }
    throw new Error(`Gagal menghasilkan jawaban AI: ${err.message}`);
  }
}

/**
 * Generates vector embeddings for a given text.
 *
 * @param {string} text
 * @param {string} [model]
 * @returns {Promise<number[]>} 768-dimension vector
 */
export async function embed(
  text,
  model = process.env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-001'
) {
  const ai = getClient();
  try {
    const res = await ai.models.embedContent({
      model,
      contents: [{ parts: [{ text }] }],
    });

    return res.embedding?.values || [];
  } catch (err) {
    throw new Error(`Gagal membuat embedding: ${err.message}`);
  }
}
