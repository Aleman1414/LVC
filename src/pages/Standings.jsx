import React, { useMemo } from 'react';
import { useFirestore } from '../hooks/useFirestore';
import { calculateStandings } from '../services/standingsService';
import { Trophy } from 'lucide-react';

const Standings = () => {
    const { data: matches, loading: matchesLoading } = useFirestore('matches');
    const { data: teams, loading: teamsLoading } = useFirestore('teams');

    const standings = useMemo(() => {
        if (!matchesLoading && !teamsLoading) {
            return calculateStandings(matches, teams);
        }
        return [];
    }, [matches, teams, matchesLoading, teamsLoading]);

    if (matchesLoading || teamsLoading) return <div>Cargando tabla...</div>;

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-primary flex items-center space-x-2">
                <Trophy className="text-secondary" />
                <span>Tabla de Posiciones</span>
            </h1>

            <div className="card overflow-x-auto p-0">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-primary text-white">
                        <tr>
                            <th className="px-4 py-3 text-center">Pos</th>
                            <th className="px-4 py-3">Equipo</th>
                            <th className="px-4 py-3 text-center">PJ</th>
                            <th className="px-4 py-3 text-center">PG</th>
                            <th className="px-4 py-3 text-center">PP</th>
                            <th className="px-4 py-3 text-center">SF</th>
                            <th className="px-4 py-3 text-center">SC</th>
                            <th className="px-4 py-3 text-center">PTS</th>
                        </tr>
                    </thead>
                    <tbody>
                        {standings.map((team, index) => (
                            <tr key={team.teamId} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                <td className="px-4 py-4 text-center font-bold text-slate-500">{index + 1}</td>
                                <td className="px-4 py-4">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                                            {team.logoUrl ? (
                                                <img src={team.logoUrl} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <Trophy size={14} className="text-slate-400" />
                                            )}
                                        </div>
                                        <span className="font-bold truncate max-w-[150px]">{team.teamName}</span>
                                    </div>
                                </td>
                                <td className="px-4 py-4 text-center">{team.pj}</td>
                                <td className="px-4 py-4 text-center text-green-600 font-semibold">{team.pg}</td>
                                <td className="px-4 py-4 text-center text-red-600">{team.pp}</td>
                                <td className="px-4 py-4 text-center text-slate-500">{team.setsFavor}</td>
                                <td className="px-4 py-4 text-center text-slate-500">{team.setsAgainst}</td>
                                <td className="px-4 py-4 text-center">
                                    <span className="bg-primary text-white px-2 py-1 rounded font-bold">{team.points}</span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Standings;
