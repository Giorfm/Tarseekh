/**
 * Semantic Tafsir Search Service (Tier 2 RAG)
 * Compliant with PRD FR-10:
 * Enables semantic & topical search (e.g. "ayat tentang sabar", "keutamaan memaafkan")
 * using embeddings and pgvector (or local cosine similarity fallback).
 */

import fs from 'node:fs';
import path from 'node:path';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { GoogleGenAI } from '@google/genai';

/**
 * Calculates cosine similarity between two numerical vectors of equal length.
 *
 * @param {number[]} vecA
 * @param {number[]} vecB
 * @returns {number} Value between -1.0 and 1.0
 */
export function cosineSimilarity(vecA, vecB) {
  if (!Array.isArray(vecA) || !Array.isArray(vecB) || vecA.length !== vecB.length || vecA.length === 0) {
    return 0;
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Performs semantic search over tafsir and verse content.
 *
 * @param {string} query
 * @param {number} [limit=5]
 * @returns {Promise<Array<{ verse_key: string, surah: number, ayah: number, surah_name?: string, arabic?: string, translation?: string, snippet: string, score: number }>>}
 */
export async function searchSemanticTafsir(query, limit = 5) {
  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    return [];
  }

  const cleanQuery = query.trim().toLowerCase();

  // 1. Check if Supabase connection & Gemini are available
  try {
    const supabase = await getSupabaseServerClient();
    const apiKey = process.env.GEMINI_API_KEY;

    if (supabase && apiKey) {
      const ai = new GoogleGenAI({ apiKey });
      const embeddingModel = process.env.GEMINI_EMBEDDING_MODEL || 'text-embedding-004';

      const embedRes = await ai.models.embedContent({
        model: embeddingModel,
        contents: cleanQuery,
      });

      const queryVector = embedRes.embedding?.values;
      if (queryVector) {
        const { data, error } = await supabase.rpc('match_tafsir', {
          query_embedding: queryVector,
          match_threshold: 0.5,
          match_count: limit,
        });

        if (!error && Array.isArray(data) && data.length > 0) {
          return data.map((row) => ({
            verse_key: row.verse_key,
            surah: row.surah,
            ayah: row.ayah,
            snippet: row.content,
            score: row.similarity,
          }));
        }
      }
    }
  } catch (err) {
    console.warn('Supabase semantic search fallback:', err.message);
  }

  // 2. Local Fallback Search (Keyword + local semantic index)
  try {
    const indexPath = path.join(process.cwd(), 'data', 'semantic-index.json');
    if (fs.existsSync(indexPath)) {
      const raw = fs.readFileSync(indexPath, 'utf8');
      const items = JSON.parse(raw);

      // Score items by keyword match in translation or tafsir content
      const queryTokens = cleanQuery.split(/\s+/).filter(Boolean);

      const scored = items
        .map((item) => {
          const text = (item.content || '').toLowerCase();
          let matchCount = 0;
          for (const token of queryTokens) {
            if (text.includes(token)) {
              matchCount += 1;
            }
          }
          const score = queryTokens.length > 0 ? matchCount / queryTokens.length : 0;
          return {
            verse_key: item.verse_key,
            surah: item.surah,
            ayah: item.ayah,
            surah_name: item.surah_name,
            arabic: item.arabic,
            translation: item.translation,
            snippet: item.translation || item.content,
            score,
          };
        })
        .filter((item) => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

      if (scored.length > 0) return scored;
    }
  } catch (localErr) {
    console.warn('Local index search failed:', localErr);
  }

  return [];
}
