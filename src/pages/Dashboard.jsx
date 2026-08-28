import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useSupabase } from '../hooks/useSupabase';
import { useLeague } from '../context/LeagueContext';
import { Trophy, Calendar, Users, History, Layers } from 'lucide-react';

const Dashboard = () => {
    const { userData } = useAuth();
    const { selectedLeague, currentLeagueObj } = useLeague();

    const { data: teams } = useSupabase('teams', { leagueId: selectedLeague });
    const { data: players } = useSupabase('players', { leagueId: selectedLeague });
    const { data: matches } = useSupabase('matches', { leagueId: selectedLeague });
    const { data: sanctions } = useSupabase('sanctions', { leagueId: selectedLeague });

    const upcomingMatches = matches?.filter(m => m.status !== 'finished').slice(0, 3) || [];

    const stats = [
        { name: 'Equipos', value: teams?.length?.toString() || '0', icon: Trophy, color: 'text-primary' },
        { name: 'Jugadores', value: players?.length?.toString() || '0', icon: Users, color: 'text-secondary' },
        { name: 'Partidos', value: matches?.length?.toString() || '0', icon: Calendar, color: 'text-blue-500' },
        { name: 'Sanciones', value: sanctions?.length?.toString() || '0', icon: History, color: 'text-red-500' },
    ];

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-primary to-primary-light text-white p-6 rounded-2xl shadow-md">
                <div>
                    <div className="flex items-center space-x-2 text-secondary-light mb-1">
                        <Layers size={18} />
                        <span className="font-semibold text-xs uppercase tracking-wider">{currentLeagueObj?.name || 'Liga de Voleibol'}</span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold">¡Hola, {userData?.full_name || userData?.displayName || 'Visitante'}! 👋</h1>
                    <p className="text-slate-200 text-sm mt-1">Panel general de estadísticas y control de la liga.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat) => (
                    <div key={stat.name} className="card flex items-center space-x-4 border-l-4 border-primary hover:shadow-lg transition-shadow">
                        <div className={`p-3 rounded-full bg-slate-100 ${stat.color}`}>
                            <stat.icon size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500 font-medium">{stat.name}</p>
                            <p className="text-2xl font-bold">{stat.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="card">
                    <h2 className="text-xl font-bold mb-4 flex items-center space-x-2">
                        <Calendar size={20} className="text-primary" />
                        <span>Próximos Partidos ({currentLeagueObj?.name})</span>
                    </h2>
                    {upcomingMatches.length > 0 ? (
                        <div className="space-y-4">
                            {upcomingMatches.map((m) => (
                                <div key={m.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                                    <div className="flex items-center space-x-3 text-sm">
                                        <span className="font-bold text-slate-800">{teams.find(t => t.id === m.team_a_id || t.id === m.teamAId)?.name || 'Equipo A'}</span>
                                        <span className="text-slate-400 font-semibold">vs</span>
                                        <span className="font-bold text-slate-800">{teams.find(t => t.id === m.team_b_id || t.id === m.teamBId)?.name || 'Equipo B'}</span>
                                    </div>
                                    <div className="text-xs text-slate-500 font-medium bg-white px-2 py-1 rounded-md border">{m.date || 'Por definir'} {m.time}</div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-slate-400 text-sm italic py-4">No hay partidos programados próximamente para esta liga.</p>
                    )}
                </div>

                <div className="card">
                    <h2 className="text-xl font-bold mb-4 flex items-center space-x-2">
                        <Trophy size={20} className="text-secondary" />
                        <span>Información y Novedades</span>
                    </h2>
                    <div className="space-y-3 text-sm text-slate-600">
                        <p className="p-3 bg-slate-50 rounded-xl border border-slate-100">🏆 Liga activa seleccionada: <strong className="text-primary">{currentLeagueObj?.name}</strong></p>
                        <p className="p-3 bg-slate-50 rounded-xl border border-slate-100">📋 Todos los equipos, partidos y clasificaciones cambian automáticamente al cambiar de liga en el selector superior.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
