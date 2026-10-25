-- ==============================================================================
-- Tarseekh - Supabase Postgres Schema (0001_init.sql)
-- Designed for Musabaqah Desain Aplikasi Al-Qur'an (DAQ)
-- Compliant with PRD 1.7 Database Design, RLS, and pgvector
-- ==============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ------------------------------------------------------------------------------
-- 1. PROFILES
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT,
    timezone TEXT DEFAULT 'Asia/Jakarta',
    daily_goal_ayah INTEGER DEFAULT 5 CHECK (daily_goal_ayah > 0),
    show_translation BOOLEAN DEFAULT FALSE,
    show_tajwid BOOLEAN DEFAULT FALSE,
    font_scale NUMERIC(3, 2) DEFAULT 1.00 CHECK (font_scale BETWEEN 0.8 AND 1.8),
    reading_view TEXT DEFAULT 'ayat' CHECK (reading_view IN ('ayat', 'halaman')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 2. STREAKS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.streaks (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    current_streak INTEGER DEFAULT 0 CHECK (current_streak >= 0),
    longest_streak INTEGER DEFAULT 0 CHECK (longest_streak >= 0),
    last_active_date DATE,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 3. READING LOGS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reading_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    surah INTEGER NOT NULL CHECK (surah BETWEEN 1 AND 114),
    ayah_from INTEGER NOT NULL CHECK (ayah_from > 0),
    ayah_to INTEGER NOT NULL CHECK (ayah_to >= ayah_from),
    mode TEXT NOT NULL CHECK (mode IN ('read', 'tajwid', 'memorize')),
    duration_sec INTEGER DEFAULT 0 CHECK (duration_sec >= 0),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 4. RECITATION ATTEMPTS (Speech tracking)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.recitation_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    surah INTEGER NOT NULL CHECK (surah BETWEEN 1 AND 114),
    ayah_from INTEGER NOT NULL CHECK (ayah_from > 0),
    ayah_to INTEGER NOT NULL CHECK (ayah_to >= ayah_from),
    accuracy NUMERIC(5, 2) NOT NULL CHECK (accuracy BETWEEN 0 AND 100),
    words_total INTEGER NOT NULL CHECK (words_total >= 0),
    words_matched INTEGER NOT NULL CHECK (words_matched >= 0),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 5. QUESTS (Daily 3 suggested quests)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.quests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    quest_date DATE NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('read', 'recite', 'reflect')),
    title TEXT NOT NULL,
    target JSONB NOT NULL DEFAULT '{}'::jsonb,
    progress INTEGER DEFAULT 0 CHECK (progress >= 0),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'claimed')),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_user_quest_date_type UNIQUE (user_id, quest_date, type)
);

-- ------------------------------------------------------------------------------
-- 6. MEMORIZATION ITEMS (SM-2 Spaced Repetition)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.memorization_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    surah INTEGER NOT NULL CHECK (surah BETWEEN 1 AND 114),
    ayah INTEGER NOT NULL CHECK (ayah > 0),
    ease NUMERIC(4, 2) DEFAULT 2.50 CHECK (ease >= 1.3),
    interval_days INTEGER DEFAULT 1 CHECK (interval_days >= 1),
    reps INTEGER DEFAULT 0 CHECK (reps >= 0),
    due_date DATE NOT NULL,
    last_result INTEGER CHECK (last_result IN (1, 3, 5)),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_user_memorization_verse UNIQUE (user_id, surah, ayah)
);

-- ------------------------------------------------------------------------------
-- 7. BOOKMARKS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bookmarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    verse_key TEXT NOT NULL,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_user_bookmark UNIQUE (user_id, verse_key)
);

-- ------------------------------------------------------------------------------
-- 8. CHAT SESSIONS & MESSAGES (Grounded RAG)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    verse_from TEXT NOT NULL,
    verse_to TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    sources JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 9. TAFSIR CHUNKS (Reference Data & pgvector for Semantic Search)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tafsir_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    verse_key TEXT NOT NULL,
    surah INTEGER NOT NULL CHECK (surah BETWEEN 1 AND 114),
    ayah INTEGER NOT NULL CHECK (ayah > 0),
    source_slug TEXT NOT NULL,
    source_name TEXT NOT NULL,
    language TEXT NOT NULL,
    content TEXT NOT NULL,
    embedding VECTOR(768),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tafsir_chunks_verse_key ON public.tafsir_chunks (verse_key);
CREATE INDEX IF NOT EXISTS idx_tafsir_chunks_embedding ON public.tafsir_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ------------------------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reading_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recitation_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memorization_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tafsir_chunks ENABLE ROW LEVEL SECURITY;

-- Profiles: users can select, update their own profile
CREATE POLICY "Users can manage own profile"
    ON public.profiles FOR ALL
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Streaks: users can view and update their own streak
CREATE POLICY "Users can manage own streaks"
    ON public.streaks FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Reading Logs: user CRUD
CREATE POLICY "Users can manage own reading_logs"
    ON public.reading_logs FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Recitation Attempts: user CRUD
CREATE POLICY "Users can manage own recitation_attempts"
    ON public.recitation_attempts FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Quests: user CRUD
CREATE POLICY "Users can manage own quests"
    ON public.quests FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Memorization Items: user CRUD
CREATE POLICY "Users can manage own memorization_items"
    ON public.memorization_items FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Bookmarks: user CRUD
CREATE POLICY "Users can manage own bookmarks"
    ON public.bookmarks FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Chat Sessions: user CRUD
CREATE POLICY "Users can manage own chat_sessions"
    ON public.chat_sessions FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Chat Messages: user access via session ownership
CREATE POLICY "Users can manage own chat_messages"
    ON public.chat_messages FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.chat_sessions s
            WHERE s.id = chat_messages.session_id AND s.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.chat_sessions s
            WHERE s.id = chat_messages.session_id AND s.user_id = auth.uid()
        )
    );

-- Tafsir Chunks: public read-only reference data
CREATE POLICY "Public read for tafsir_chunks"
    ON public.tafsir_chunks FOR SELECT
    USING (true);

-- ------------------------------------------------------------------------------
-- DATABASE TRIGGERS & FUNCTIONS
-- ------------------------------------------------------------------------------

-- Trigger on auth.users to auto-create profile and streak
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, display_name)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));

    INSERT INTO public.streaks (user_id, current_streak, longest_streak)
    VALUES (NEW.id, 0, 0);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Semantic Search Function for Tafsir (Tier 2 RAG)
CREATE OR REPLACE FUNCTION public.match_tafsir(
    query_embedding VECTOR(768),
    match_threshold FLOAT DEFAULT 0.65,
    match_count INT DEFAULT 5
)
RETURNS TABLE (
    id UUID,
    verse_key TEXT,
    surah INTEGER,
    ayah INTEGER,
    source_name TEXT,
    content TEXT,
    similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        tc.id,
        tc.verse_key,
        tc.surah,
        tc.ayah,
        tc.source_name,
        tc.content,
        1 - (tc.embedding <=> query_embedding) AS similarity
    FROM public.tafsir_chunks tc
    WHERE tc.embedding IS NOT NULL
      AND 1 - (tc.embedding <=> query_embedding) > match_threshold
    ORDER BY tc.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;
