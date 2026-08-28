-- ========================================================
-- Tabla de Traspasos de Jugadores
-- ========================================================

CREATE TABLE IF NOT EXISTS public.transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID REFERENCES public.players(id) ON DELETE CASCADE,
    from_team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
    to_team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
    transfer_date TEXT DEFAULT current_date::text,
    reason TEXT,
    status TEXT DEFAULT 'completed',
    league_id UUID REFERENCES public.leagues(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.transfers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir acceso total a transfers" ON public.transfers FOR ALL USING (true) WITH CHECK (true);
