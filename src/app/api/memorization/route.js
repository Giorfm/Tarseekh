import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { calculateSM2 } from '@/lib/memorization/engine';
import { getLocalTodayString } from '@/lib/streak';

const reviewSchema = z.object({
  surah: z.number().int().min(1).max(114),
  ayah: z.number().int().min(1),
  grade: z.union([z.literal(1), z.literal(3), z.literal(5)]), // 1: Lupa, 3: Ragu, 5: Hafal
  timezone: z.string().optional().default('Asia/Jakarta'),
});

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const timezone = searchParams.get('timezone') || 'Asia/Jakarta';
    const today = getLocalTodayString(new Date(), timezone);

    const supabase = await getSupabaseServerClient();
    if (supabase) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: dueItems, error } = await supabase
          .from('memorization_items')
          .select('*')
          .eq('user_id', user.id)
          .lte('due_date', today)
          .order('due_date', { ascending: true });

        if (error) {
          console.error('Supabase memorization GET error:', error);
        }

        return NextResponse.json({
          today,
          dueItems: dueItems || [],
          totalDue: dueItems?.length || 0,
          source: 'cloud',
        });
      }
    }

    return NextResponse.json({
      today,
      dueItems: [],
      totalDue: 0,
      source: 'local',
      message: 'Mode lokal: gunakan penyimpanan browser untuk hafalan',
    });
  } catch (error) {
    console.error('Memorization GET error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const validated = reviewSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: 'Data penilaian tidak valid', details: validated.error.format() },
        { status: 400 }
      );
    }

    const { surah, ayah, grade, timezone } = validated.data;
    const today = getLocalTodayString(new Date(), timezone);

    const supabase = await getSupabaseServerClient();
    if (supabase) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        // Find existing record or default
        const { data: existing } = await supabase
          .from('memorization_items')
          .select('*')
          .eq('user_id', user.id)
          .eq('surah', surah)
          .eq('ayah', ayah)
          .maybeSingle();

        const sm2Result = calculateSM2(
          {
            ease: Number(existing?.ease || 2.5),
            interval: Number(existing?.interval_days || 0),
            reps: Number(existing?.reps || 0),
          },
          grade
        );

        const { data: updated, error } = await supabase
          .from('memorization_items')
          .upsert({
            user_id: user.id,
            surah,
            ayah,
            ease: sm2Result.ease,
            interval_days: sm2Result.interval,
            reps: sm2Result.reps,
            due_date: sm2Result.dueDate,
            last_result: grade,
            updated_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (error) {
          console.error('Error saving memorization item:', error);
          return NextResponse.json({ error: 'Gagal menyimpan hasil hafalan' }, { status: 500 });
        }

        return NextResponse.json({
          success: true,
          mode: 'cloud',
          item: updated,
        });
      }
    }

    // Guest mode calculation
    const sm2Result = calculateSM2({ ease: 2.5, interval: 0, reps: 0 }, grade);
    return NextResponse.json({
      success: true,
      mode: 'local',
      item: {
        surah,
        ayah,
        ...sm2Result,
        last_result: grade,
      },
    });
  } catch (error) {
    console.error('Memorization POST error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
