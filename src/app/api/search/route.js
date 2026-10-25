import { NextResponse } from 'next/server';
import { z } from 'zod';
import { searchSemanticTafsir } from '@/lib/rag/semantic';

const searchSchema = z.object({
  q: z.string().min(2, 'Kata kunci pencarian minimal 2 karakter'),
  limit: z.coerce.number().int().min(1).max(20).optional().default(5),
});

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = searchSchema.safeParse({
      q: searchParams.get('q') || '',
      limit: searchParams.get('limit') || '5',
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Parameter tidak valid', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { q, limit } = parsed.data;
    const results = await searchSemanticTafsir(q, limit);

    return NextResponse.json({
      query: q,
      count: results.length,
      results,
    });
  } catch (err) {
    console.error('Semantic search route error:', err);
    return NextResponse.json({ error: 'Server error saat pencarian semantik' }, { status: 500 });
  }
}
