import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export function useSupabase(tableName, options = {}) {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const { leagueId, filterField = 'league_id' } = options;

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

        // Subscripción en tiempo real con Supabase Channels
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
            // Eliminar campos undefined
            const clean = { ...newData };
            Object.keys(clean).forEach(key => {
                if (clean[key] === undefined) delete clean[key];
            });

            // Asignar league_id si aplica
            if (leagueId && leagueId !== 'all' && !clean.league_id) {
                clean.league_id = leagueId;
            }

            const { data: inserted, error: insertErr } = await supabase
                .from(tableName)
                .insert([clean])
                .select();

            if (insertErr) throw insertErr;
            await fetchData();
            return inserted?.[0];
        } catch (err) {
            console.error(`Error agregando en ${tableName}:`, err);
            throw err;
        }
    };

    const updateData = async (id, updatedData) => {
        try {
            const clean = { ...updatedData };
            Object.keys(clean).forEach(key => {
                if (clean[key] === undefined) delete clean[key];
            });

            const { data: updated, error: updateErr } = await supabase
                .from(tableName)
                .update(clean)
                .eq('id', id)
                .select();

            if (updateErr) throw updateErr;
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
            // Determinar bucket basado en path (logos, players, documents)
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

// Alias para compatibilidad con código existente
export const useFirestore = useSupabase;
