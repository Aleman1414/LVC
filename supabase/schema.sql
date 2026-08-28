-- ========================================================
-- Schema DDL para Liga de Voleibol de Comayagua (LVC)
-- Ejecutar este archivo en el SQL Editor de Supabase
-- ========================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABLA DE LIGAS (3 Ligas Solicitadas)
CREATE TABLE IF NOT EXISTS public.leagues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Insertar Ligas iniciales si no existen
INSERT INTO public.leagues (name, slug, description)
VALUES 
    ('Liga de Volibol Comayagua', 'liga-comayagua', 'Liga Principal Mayor de Voleibol de Comayagua'),
    ('Liga B', 'liga-b', 'Liga de Segunda Categoría / Ascenso'),
    ('Liga de Mujeres', 'liga-mujeres', 'Liga Femenil de Voleibol de Comayagua')
ON CONFLICT (slug) DO NOTHING;

-- 2. TABLA DE PERFILES DE USUARIO
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    role TEXT DEFAULT 'user',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. TABLA DE EQUIPOS
CREATE TABLE IF NOT EXISTS public.teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    logo_url TEXT,
    foundation_date TEXT,
    delegate_name TEXT,
    contact TEXT,
    status TEXT DEFAULT 'active',
    category TEXT DEFAULT 'Masculino',
    league_id UUID REFERENCES public.leagues(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. TABLA DE JUGADORES
CREATE TABLE IF NOT EXISTS public.players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    number INTEGER,
    position TEXT,
    photo_url TEXT,
    status TEXT DEFAULT 'active',
    team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
    league_id UUID REFERENCES public.leagues(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. TABLA DE PARTIDOS
CREATE TABLE IF NOT EXISTS public.matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_a_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
    team_b_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
    date TEXT,
    time TEXT,
    location TEXT,
    status TEXT DEFAULT 'scheduled',
    score JSONB DEFAULT '{"setsA":0,"setsB":0,"setScores":[]}'::jsonb,
    round TEXT,
    league_id UUID REFERENCES public.leagues(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. TABLA DE SANCIONES
CREATE TABLE IF NOT EXISTS public.sanctions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID REFERENCES public.players(id) ON DELETE SET NULL,
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
    type TEXT,
    reason TEXT,
    fine NUMERIC DEFAULT 0,
    date TEXT,
    status TEXT DEFAULT 'pending',
    league_id UUID REFERENCES public.leagues(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. TABLA DE REUNIONES / ACTAS
CREATE TABLE IF NOT EXISTS public.meetings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    date TEXT,
    description TEXT,
    file_url TEXT,
    status TEXT DEFAULT 'published',
    league_id UUID REFERENCES public.leagues(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ========================================================
-- AUTOMÁTICO: Trigger para crear perfil al registrar usuario
-- ========================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (
        new.id,
        new.email,
        coalesce(new.raw_user_meta_data->>'full_name', new.email),
        coalesce(new.raw_user_meta_data->>'role', 'user')
    );
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ========================================================
-- SEGURIDAD Y POLÍTICAS RLS (Row Level Security)
-- ========================================================
ALTER TABLE public.leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sanctions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;

-- Políticas de lectura y escritura públicas (para fácil gestión de datos)
CREATE POLICY "Permitir acceso total a ligas" ON public.leagues FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir acceso total a perfiles" ON public.profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir acceso total a equipos" ON public.teams FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir acceso total a jugadores" ON public.players FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir acceso total a partidos" ON public.matches FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir acceso total a sanciones" ON public.sanctions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir acceso total a reuniones" ON public.meetings FOR ALL USING (true) WITH CHECK (true);

-- ========================================================
-- STORAGE BUCKETS (Crear en Supabase Dashboard > Storage)
-- Buckets sugeridos: 'logos', 'players', 'documents'
-- ========================================================
INSERT INTO storage.buckets (id, name, public) 
VALUES ('logos', 'logos', true), ('players', 'players', true), ('documents', 'documents', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Lectura publica de storage logos" ON storage.objects FOR SELECT USING (bucket_id = 'logos');
CREATE POLICY "Lectura publica de storage players" ON storage.objects FOR SELECT USING (bucket_id = 'players');
CREATE POLICY "Lectura publica de storage documents" ON storage.objects FOR SELECT USING (bucket_id = 'documents');

CREATE POLICY "Escritura publica en storage logos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'logos');
CREATE POLICY "Escritura publica en storage players" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'players');
CREATE POLICY "Escritura publica en storage documents" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'documents');

-- ========================================================
-- SEED DE EQUIPOS DE LVC CON LOGOS
-- ========================================================
DO $$
DECLARE
    lvc_id UUID;
BEGIN
    SELECT id INTO lvc_id FROM public.leagues WHERE slug = 'liga-comayagua' LIMIT 1;

    IF lvc_id IS NOT NULL THEN
        INSERT INTO public.teams (name, logo_url, category, status, league_id)
        VALUES
            ('Black Jackals', '/assets/logos/Black-Jackals.jpg', 'Masculino', 'active', lvc_id),
            ('Espartanos', '/assets/logos/Espartanos.jpg', 'Masculino', 'active', lvc_id),
            ('Guerreros', '/assets/logos/Guerreros.jpg', 'Masculino', 'active', lvc_id),
            ('Halcones', '/assets/logos/Halcones.jpg', 'Masculino', 'active', lvc_id),
            ('Kristo', '/assets/logos/Kristo.jpg', 'Masculino', 'active', lvc_id),
            ('Leyendas', '/assets/logos/Leyendas.jpg', 'Masculino', 'active', lvc_id),
            ('ANAPO', '/assets/logos/ANAPO.jpg', 'Masculino', 'active', lvc_id),
            ('San Jerónimo', '/assets/logos/San-jeronimo.jpg', 'Masculino', 'active', lvc_id)
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

