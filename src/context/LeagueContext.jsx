import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const LeagueContext = createContext();

export const DEFAULT_LEAGUES = [
    { id: 'liga-comayagua', name: 'Liga de Volibol Comayagua', slug: 'liga-comayagua' },
    { id: 'liga-b', name: 'Liga B', slug: 'liga-b' },
    { id: 'liga-mujeres', name: 'Liga de Mujeres', slug: 'liga-mujeres' }
];

export function LeagueProvider({ children }) {
    const [leagues, setLeagues] = useState(DEFAULT_LEAGUES);
    const [selectedLeague, setSelectedLeagueState] = useState(() => {
        return localStorage.getItem('lvc_selected_league') || DEFAULT_LEAGUES[0].id;
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchLeagues() {
            try {
                const { data, error } = await supabase.from('leagues').select('*').order('created_at', { ascending: true });
                if (data && data.length > 0 && !error) {
                    setLeagues(data);
                    // If stored selection is invalid, reset to first league
                    const exists = data.some(l => l.id === selectedLeague || l.slug === selectedLeague);
                    if (!exists && data[0]) {
                        setSelectedLeagueState(data[0].id);
                        localStorage.setItem('lvc_selected_league', data[0].id);
                    }
                }
            } catch (err) {
                console.warn('Usando ligas predeterminadas:', err);
            } finally {
                setLoading(false);
            }
        }
        fetchLeagues();
    }, []);

    const setSelectedLeague = (leagueId) => {
        setSelectedLeagueState(leagueId);
        localStorage.setItem('lvc_selected_league', leagueId);
    };

    const value = {
        leagues,
        selectedLeague,
        setSelectedLeague,
        currentLeagueObj: leagues.find(l => l.id === selectedLeague || l.slug === selectedLeague) || leagues[0],
        loading
    };

    return (
        <LeagueContext.Provider value={value}>
            {children}
        </LeagueContext.Provider>
    );
}

export function useLeague() {
    const context = useContext(LeagueContext);
    if (!context) {
        throw new Error('useLeague debe ser usado dentro de un LeagueProvider');
    }
    return context;
}
