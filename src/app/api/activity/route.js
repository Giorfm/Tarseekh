import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { recordActivityStreak, getLocalTodayString } from '@/lib/streak';

const activitySchema = z.object({
  type: z.enum(['read', 'recite', 'memorize', 'reflect']),
  surah: z.number().int().min(1).max(114).optional().default(1),
  ayah_from: z.number().int().min(1).optional().default(1),
  ayah_to: z.number().int().min(1).optional().default(1),
  duration_sec: z.number().int().min(0).optional().default(0),
  timezone: z.string().optional().default('Asia/Jakarta'),
  recitation: z
    .object({
      accuracy: z.number().min(0).max(100),
      words_total: z.number().int().min(0),
      words_matched: z.number().int().min(0),
    })
    .optional(),
});

export async function POST(request) {
  try {
    const body = await request.json();
    const validated = activitySchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: 'Input aktivitas tidak valid', details: validated.error.format() },
        { status: 400 }
      );
    }

    const activity = validated.data;
    const today = getLocalTodayString(new Date(), activity.timezone);

    // Try Supabase Auth
    const supabase = await getSupabaseServerClient();
    if (supabase) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        // 1. Insert into reading_logs
        if (activity.type === 'read' || activity.type === 'memorize') {
          await supabase.from('reading_logs').insert({
            user_id: user.id,
            surah: activity.surah,
            ayah_from: activity.ayah_from,
            ayah_to: activity.ayah_to,
            mode: activity.type === 'memorize' ? 'memorize' : 'read',
            duration_sec: activity.duration_sec,
          });
        }

        // 2. Insert into recitation_attempts if speech tracking
        if (activity.type === 'recite' && activity.recitation) {
          await supabase.from('recitation_attempts').insert({
            user_id: user.id,
            surah: activity.surah,
            ayah_from: activity.ayah_from,
            ayah_to: activity.ayah_to,
            accuracy: activity.recitation.accuracy,
            words_total: activity.recitation.words_total,
            words_matched: activity.recitation.words_matched,
          });
        }

        // 3. Update Streaks in DB
        const { data: streakRow } = await supabase
          .from('streaks')
          .select('*')
          .eq('user_id', user.id)
          .single();

        const updatedStreak = recordActivityStreak(
          streakRow || { current_streak: 0, longest_streak: 0, last_active_date: null },
          today,
          activity.timezone
        );

        await supabase.from('streaks').upsert({
          user_id: user.id,
          current_streak: updatedStreak.current_streak,
          longest_streak: updatedStreak.longest_streak,
          last_active_date: updatedStreak.last_active_date,
          updated_at: new Date().toISOString(),
        });

        return NextResponse.json({
          success: true,
          mode: 'cloud',
          streak: updatedStreak,
          today,
        });
      }
    }

    // Guest / Local Fallback response
    return NextResponse.json({
      success: true,
      mode: 'local',
      message: 'Aktivitas tervalidasi',
      activity,
      today,
    });
  } catch (error) {
    console.error('Activity route error:', error);
    return NextResponse.json({ error: 'Server error saat mencatat aktivitas' }, { status: 500 });
  }
}
