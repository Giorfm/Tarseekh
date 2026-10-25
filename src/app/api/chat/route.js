/**
 * src/app/api/chat/route.js
 * Grounded AI Chat endpoint for Tarseekh AI (RAG Tier 1).
 * Features:
 * - Zod input validation
 * - Per-IP daily rate limiting
 * - Context retrieval (verse, translation, classical tafsir)
 * - Gemini generateStream with system prompt
 * - Server-Sent Event streaming with source metadata sent first
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { retrieve } from '@/lib/rag/retrieve';
import { SYSTEM_PROMPT, buildPrompt } from '@/lib/rag/prompt';
import { generateStream } from '@/lib/llm/gemini';

const chatRequestSchema = z.object({
  verseKeys: z.array(z.string()).min(1, 'Pilih minimal satu ayat').max(7, 'Maksimal 7 ayat sekaligus'),
  question: z.string().min(1, 'Pertanyaan tidak boleh kosong').max(500, 'Pertanyaan maksimal 500 karakter'),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'model']),
        content: z.string().max(2000),
      })
    )
    .max(6, 'Riwayat percakapan maksimal 6 pesan')
    .optional()
    .default([]),
});

// In-memory daily rate limiting per IP
const ipRateLimits = new Map();
const DAILY_LIMIT = parseInt(process.env.CHAT_DAILY_LIMIT || '30', 10);

function checkRateLimit(ip) {
  const today = new Date().toISOString().split('T')[0];
  const record = ipRateLimits.get(ip);

  if (!record || record.date !== today) {
    ipRateLimits.set(ip, { count: 1, date: today });
    return { allowed: true, remaining: DAILY_LIMIT - 1 };
  }

  if (record.count >= DAILY_LIMIT) {
    return { allowed: false, remaining: 0 };
  }

  record.count += 1;
  return { allowed: true, remaining: DAILY_LIMIT - record.count };
}

export async function POST(request) {
  try {
    // 1. IP extraction & rate limit check
    const forwardedFor = request.headers.get('x-forwarded-for');
    const ip = forwardedFor ? forwardedFor.split(',')[0].trim() : '127.0.0.1';

    const rateLimit = checkRateLimit(ip);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: `Batas harian tanya AI telah tercapai (maksimal ${DAILY_LIMIT} pertanyaan per hari). Silakan kembali besok.`,
        },
        { status: 429 }
      );
    }

    // 2. Body parsing and Zod validation
    const body = await request.json();
    const validated = chatRequestSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        {
          error: 'Input tidak valid',
          details: validated.error.format(),
        },
        { status: 400 }
      );
    }

    const { verseKeys, question, history } = validated.data;

    // 3. RAG Retrieval (Tier 1 Direct Lookup)
    const { verses, tafsirChunks } = await retrieve(verseKeys);

    if (verses.length === 0) {
      return NextResponse.json(
        { error: 'Ayat yang dipilih tidak ditemukan dalam data mushaf.' },
        { status: 404 }
      );
    }

    // Extract unique source chips for the response
    const sources = tafsirChunks.map((c) => ({
      source: c.source,
      verseKey: c.verseKey,
      slug: c.slug,
    }));

    // 4. Build Grounded Prompt
    const prompt = buildPrompt({
      verses,
      tafsirChunks,
      question,
    });

    // 5. Streaming Response via SSE
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        // Send sources event first
        const sourcesEvent = `data: ${JSON.stringify({
          type: 'sources',
          sources,
          verses: verses.map((v) => ({ key: v.key, name: v.surahName, text: v.text })),
        })}\n\n`;
        controller.enqueue(encoder.encode(sourcesEvent));

        // If GEMINI_API_KEY is missing, send friendly message
        if (!process.env.GEMINI_API_KEY) {
          const mockNotice = `data: ${JSON.stringify({
            type: 'token',
            content:
              '[Pemberitahuan Demo]\nGEMINI_API_KEY belum dikonfigurasi di lingkungan server.\n\nKonteks tafsir untuk ayat ' +
              verseKeys.join(', ') +
              ' telah berhasil diambil dari database rujukan:\n' +
              sources.map((s) => `• [${s.source} ${s.verseKey}]`).join('\n') +
              '\n\nSilakan tambahkan GEMINI_API_KEY ke file .env.local untuk mengaktifkan respons AI interaktif secara penuh.',
          })}\n\n`;
          controller.enqueue(encoder.encode(mockNotice));
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`));
          controller.close();
          return;
        }

        try {
          const generator = generateStream({
            prompt,
            systemInstruction: SYSTEM_PROMPT,
            history,
          });

          for await (const token of generator) {
            const tokenEvent = `data: ${JSON.stringify({
              type: 'token',
              content: token,
            })}\n\n`;
            controller.enqueue(encoder.encode(tokenEvent));
          }

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`));
        } catch (streamErr) {
          const errorEvent = `data: ${JSON.stringify({
            type: 'error',
            message: streamErr.message,
          })}\n\n`;
          controller.enqueue(encoder.encode(errorEvent));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    });
  } catch (err) {
    console.error('Chat endpoint error:', err);
    return NextResponse.json({ error: 'Terjadi kesalahan pada server' }, { status: 500 });
  }
}
