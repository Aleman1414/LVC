import React, { useMemo } from 'react';
import { useSupabase } from '../hooks/useSupabase';
import { useLeague } from '../context/LeagueContext';
import { calculateStandings } from '../services/standingsService';
import { Trophy, Layers } from 'lucide-react';

const Standings = () => {
    const { selectedLeague, currentLeagueObj } = useLeague();
    const { data: matches, loading: matchesLoading } = useSupabase('matches', { leagueId: selectedLeague });
    const { data: teams, loading: teamsLoading } = useSupabase('teams', { leagueId: selectedLeague });

    const standings = useMemo(() => {
        if (!matchesLoading && !teamsLoading) {
            return calculateStandings(matches || [], teams || []);
        }
        return [];
    }, [matches, teams, matchesLoading, teamsLoading]);

    if (matchesLoading || teamsLoading) return <div className="p-8 text-center text-slate-500">Cargando tabla de posiciones...</div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div>
                    <h1 className="text-3xl font-bold text-primary flex items-center space-x-2">
                        <Trophy className="text-secondary" />
                        <span>Tabla de Posiciones</span>
                    </h1>
                    <p className="text-sm text-slate-500 flex items-center space-x-1 mt-1">
                        <Layers size={14} className="text-slate-400" />
                        <span>Competencia activa: <strong>{currentLeagueObj?.name}</strong></span>
                    </p>
                </div>
            </div>

            <div className="card overflow-x-auto p-0 shadow-md border border-slate-100 rounded-2xl overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-primary text-white">
                        <tr>
                            <th className="px-4 py-3 text-center text-xs uppercase tracking-wider font-semibold">Pos</th>
                            <th className="px-4 py-3 text-xs uppercase tracking-wider font-semibold">Equipo</th>
                            <th className="px-4 py-3 text-center text-xs uppercase tracking-wider font-semibold">PJ</th>
                            <th className="px-4 py-3 text-center text-xs uppercase tracking-wider font-semibold">PG</th>
                            <th className="px-4 py-3 text-center text-xs uppercase tracking-wider font-semibold">PP</th>
                            <th className="px-4 py-3 text-center text-xs uppercase tracking-wider font-semibold">SF</th>
                            <th className="px-4 py-3 text-center text-xs uppercase tracking-wider font-semibold">SC</th>
                            <th className="px-4 py-3 text-center text-xs uppercase tracking-wider font-semibold">PTS</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {standings.length > 0 ? (
                            standings.map((team, index) => (
                                <tr key={team.teamId} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-4 py-4 text-center font-bold text-slate-500">{index + 1}</td>
                                    <td className="px-4 py-4">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden flex-shrink-0 border border-slate-200">
                                                {team.logoUrl ? (
                                                    <img src={team.logoUrl} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <Trophy size={14} className="text-slate-400" />
                                                )}
                                            </div>
                                            <span className="font-bold truncate max-w-[180px] text-slate-800">{team.teamName}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 text-center font-medium text-slate-700">{team.pj}</td>
                                    <td className="px-4 py-4 text-center text-green-600 font-bold">{team.pg}</td>
                                    <td className="px-4 py-4 text-center text-red-500 font-medium">{team.pp}</td>
                                    <td className="px-4 py-4 text-center text-slate-500">{team.setsFavor}</td>
                                    <td className="px-4 py-4 text-center text-slate-500">{team.setsAgainst}</td>
                                    <td className="px-4 py-4 text-center">
                                        <span className="bg-primary text-white px-2.5 py-1 rounded-lg font-extrabold text-sm">{team.points}</span>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="8" className="px-4 py-8 text-center text-slate-400 italic">
                                    No hay equipos registrados o partidos finalizados en la {currentLeagueObj?.name}.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Standings;
