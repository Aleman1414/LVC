-- ========================================================
-- Seed de Equipos con Logos para Liga de Volibol Comayagua
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
