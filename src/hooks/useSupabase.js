import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const ALLOWED_COLUMNS = {
    teams: ['id', 'name', 'logo_url', 'foundation_date', 'delegate_name', 'contact', 'status', 'category', 'league_id', 'created_at'],
    players: ['id', 'name', 'number', 'position', 'photo_url', 'status', 'team_id', 'league_id', 'created_at'],
    matches: ['id', 'team_a_id', 'team_b_id', 'date', 'time', 'location', 'status', 'score', 'round', 'league_id', 'created_at'],
    sanctions: ['id', 'player_id', 'team_id', 'type', 'reason', 'fine', 'date', 'status', 'league_id', 'created_at'],
    meetings: ['id', 'title', 'date', 'description', 'file_url', 'status', 'league_id', 'created_at'],
    profiles: ['id', 'email', 'full_name', 'role', 'created_at']
};

export function useSupabase(tableName, options = {}) {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const { leagueId, filterField = 'league_id' } = options;

    const sanitizePayload = useCallback((payload) => {
        const clean = { ...payload };

        // Mapeos de compatibilidad camelCase -> snake_case
        if (clean.logoUrl && !clean.logo_url) clean.logo_url = clean.logoUrl;
        if (clean.photoUrl && !clean.photo_url) clean.photo_url = clean.photoUrl;
        if (clean.teamId && !clean.team_id) clean.team_id = clean.teamId;
        if (clean.playerId && !clean.player_id) clean.player_id = clean.playerId;
        if (clean.teamAId && !clean.team_a_id) clean.team_a_id = clean.teamAId;
        if (clean.teamBId && !clean.team_b_id) clean.team_b_id = clean.teamBId;
        if (clean.pdfUrl && !clean.file_url) clean.file_url = clean.pdfUrl;

        // Asignar league_id si aplica
        if (leagueId && leagueId !== 'all' && !clean.league_id) {
            clean.league_id = leagueId;
        }

        // Filtrar únicamente columnas válidas si la tabla está en ALLOWED_COLUMNS
        const validColumns = ALLOWED_COLUMNS[tableName];
        if (validColumns) {
            const sanitized = {};
            Object.keys(clean).forEach(key => {
                if (validColumns.includes(key) && clean[key] !== undefined) {
                    sanitized[key] = clean[key];
                }
            });
            return sanitized;
        }

        // Eliminar valores undefined
        Object.keys(clean).forEach(key => {
            if (clean[key] === undefined) delete clean[key];
        });
        return clean;
    }, [tableName, leagueId]);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            let query = supabase.from(tableName).select('*').order('created_at', { ascending: false });

            if (leagueId && leagueId !== 'all') {
                query = query.eq(filterField, leagueId);
            }

            const { data: result, error: fetchErr } = await query;
            if (fetchErr) throw fetchErr;

            setData(result || []);
            setError(null);
        } catch (err) {
            console.error(`Error en fetch de ${tableName}:`, err);
            setError(err);
        } finally {
            setLoading(false);
        }
    }, [tableName, leagueId, filterField]);

    useEffect(() => {
        fetchData();

        const channel = supabase
            .channel(`public:${tableName}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: tableName }, () => {
                fetchData();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [tableName, fetchData]);

    const addData = async (newData) => {
        try {
            const clean = sanitizePayload(newData);

            const { data: inserted, error: insertErr } = await supabase
                .from(tableName)
                .insert([clean])
                .select();

            if (insertErr) {
                console.error(`Error de Supabase al insertar en ${tableName}:`, insertErr);
                throw insertErr;
            }
            await fetchData();
            return inserted?.[0];
        } catch (err) {
            console.error(`Error agregando en ${tableName}:`, err);
            throw err;
        }
    };

    const updateData = async (id, updatedData) => {
        try {
            const clean = sanitizePayload(updatedData);
            delete clean.id;

            const { data: updated, error: updateErr } = await supabase
                .from(tableName)
                .update(clean)
                .eq('id', id)
                .select();

            if (updateErr) {
                console.error(`Error de Supabase al actualizar en ${tableName}:`, updateErr);
                throw updateErr;
            }
            await fetchData();
            return updated?.[0];
        } catch (err) {
            console.error(`Error actualizando en ${tableName}:`, err);
            throw err;
        }
    };

    const deleteData = async (id) => {
        try {
            const { error: deleteErr } = await supabase
                .from(tableName)
                .delete()
                .eq('id', id);

            if (deleteErr) throw deleteErr;
            await fetchData();
        } catch (err) {
            console.error(`Error eliminando en ${tableName}:`, err);
            throw err;
        }
    };

    const uploadFile = async (file, path) => {
        try {
            let bucket = 'documents';
            if (path.startsWith('logos/')) bucket = 'logos';
            else if (path.startsWith('players/')) bucket = 'players';

            const cleanPath = path.replace(/^(logos\/|players\/|documents\/)/, '');
            const filePath = `${Date.now()}_${cleanPath}`;

            const { data: uploadData, error: uploadErr } = await supabase
                .storage
                .from(bucket)
                .upload(filePath, file, { upsert: true });

            if (uploadErr) throw uploadErr;

            const { data: publicUrlData } = supabase
                .storage
                .from(bucket)
                .getPublicUrl(uploadData.path);

            return publicUrlData.publicUrl;
        } catch (err) {
            console.error(`Error subiendo archivo a Supabase Storage:`, err);
            throw err;
        }
    };

    return { data, loading, error, addData, updateData, deleteData, uploadFile, refetch: fetchData };
}

export const useFirestore = useSupabase;
