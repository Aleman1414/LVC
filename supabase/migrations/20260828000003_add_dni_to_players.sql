-- ========================================================
-- Migration: Agregar columna DNI a la tabla players
-- ========================================================

ALTER TABLE public.players ADD COLUMN IF NOT EXISTS dni TEXT;

-- Índice único parcial para evitar DNI duplicados (permitiendo nulos para los existentes)
CREATE UNIQUE INDEX IF NOT EXISTS idx_players_dni_unique 
ON public.players (dni) 
WHERE dni IS NOT NULL AND dni <> '';
