import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getLocalTodayString } from '@/lib/streak';
import {
  generateDailyQuests,
  claimQuestReward,
} from '@/lib/quests';

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
        // Fetch existing quests for today
        const { data: existingQuests } = await supabase
          .from('quests')
          .select('*')
          .eq('user_id', user.id)
          .eq('quest_date', today);

        if (existingQuests && existingQuests.length > 0) {
          return NextResponse.json({
            date: today,
            quests: existingQuests,
            source: 'cloud',
          });
        }

        // Get profile settings for adaptive targets
        const { data: profile } = await supabase
          .from('profiles')
          .select('daily_goal_ayah, reading_view')
          .eq('id', user.id)
          .single();

        const newQuests = generateDailyQuests({
          questDate: today,
          userProfile: profile || {},
        });

        const rowsToInsert = newQuests.map((q) => ({
          user_id: user.id,
          quest_date: today,
          type: q.type,
          title: q.title,
          target: q.target,
          progress: 0,
          status: 'pending',
        }));

        await supabase.from('quests').insert(rowsToInsert);

        return NextResponse.json({
          date: today,
          quests: newQuests,
          source: 'cloud',
        });
      }
    }

    // Guest fallback
    const guestQuests = generateDailyQuests({ questDate: today });
    return NextResponse.json({
      date: today,
      quests: guestQuests,
      source: 'local',
    });
  } catch (error) {
    console.error('Quests GET error:', error);
    return NextResponse.json({ error: 'Gagal memuat quest harian' }, { status: 500 });
  }
}

const claimSchema = z.object({
  quest_id: z.string(),
  today: z.string().optional(),
});

export async function POST(request) {
  try {
    const body = await request.json();
    const validated = claimSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json({ error: 'Format klaim tidak valid' }, { status: 400 });
    }

    const { quest_id } = validated.data;
    const supabase = await getSupabaseServerClient();

    if (supabase) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: quest } = await supabase
          .from('quests')
          .select('*')
          .eq('id', quest_id)
          .eq('user_id', user.id)
          .single();

        if (!quest) {
          return NextResponse.json({ error: 'Quest tidak ditemukan' }, { status: 404 });
        }

        if (quest.status === 'claimed') {
          return NextResponse.json({ error: 'Hadiah sudah diklaim' }, { status: 400 });
        }

        if (quest.status !== 'completed' && quest.progress < quest.target.count) {
          return NextResponse.json({ error: 'Quest belum selesai' }, { status: 400 });
        }

        const { data: updated } = await supabase
          .from('quests')
          .update({ status: 'claimed' })
          .eq('id', quest_id)
          .select()
          .single();

        return NextResponse.json({ success: true, quest: updated });
      }
    }

    // Guest mode
    return NextResponse.json({
      success: true,
      message: 'Quest diklaim di mode lokal',
      quest_id,
    });
  } catch (error) {
    console.error('Quests POST claim error:', error);
    return NextResponse.json({ error: 'Gagal mengklaim quest' }, { status: 500 });
  }
}
