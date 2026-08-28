import React, { useState } from 'react';
import { useSupabase } from '../hooks/useSupabase';
import { useLeague } from '../context/LeagueContext';
import { Plus, Calendar, MapPin, Play, CheckCircle, Clock, Edit2, Layers } from 'lucide-react';
import { Link } from 'react-router-dom';

const Matches = () => {
    const { selectedLeague, currentLeagueObj } = useLeague();
    const { data: matches, loading: matchesLoading, addData, updateData } = useSupabase('matches', { leagueId: selectedLeague });
    const { data: teams, loading: teamsLoading } = useSupabase('teams', { leagueId: selectedLeague });

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentMatch, setCurrentMatch] = useState(null);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        team_a_id: '',
        team_b_id: '',
        date: '',
        time: '',
        location: '',
        status: 'scheduled',
        setsA: 0,
        setsB: 0,
        round: 'Jornada 1'
    });

    const handleOpenModal = (match = null) => {
        setError('');
        if (match) {
            setCurrentMatch(match);
            setFormData({
                team_a_id: match.team_a_id || match.teamAId || '',
                team_b_id: match.team_b_id || match.teamBId || '',
                date: match.date || '',
                time: match.time || '',
                location: match.location || '',
                status: match.status || 'scheduled',
                setsA: match.score?.setsA ?? match.score?.sets_a ?? 0,
                setsB: match.score?.setsB ?? match.score?.sets_b ?? 0,
                round: match.round || 'Jornada 1'
            });
        } else {
            setCurrentMatch(null);
            setFormData({
                team_a_id: teams[0]?.id || '',
                team_b_id: teams[1]?.id || '',
                date: '',
                time: '',
                location: '',
                status: 'scheduled',
                setsA: 0,
                setsB: 0,
                round: 'Jornada 1'
            });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (formData.team_a_id === formData.team_b_id) {
            setError('Debes seleccionar dos equipos diferentes.');
            return;
        }

        try {
            const matchData = {
                team_a_id: formData.team_a_id,
                teamAId: formData.team_a_id,
                team_b_id: formData.team_b_id,
                teamBId: formData.team_b_id,
                date: formData.date,
                time: formData.time,
                location: formData.location,
                status: formData.status,
                round: formData.round,
                score: {
                    setsA: parseInt(formData.setsA, 10) || 0,
                    setsB: parseInt(formData.setsB, 10) || 0
                },
                league_id: selectedLeague
            };

            if (currentMatch) {
                await updateData(currentMatch.id, matchData);
            } else {
                await addData(matchData);
            }
            setIsModalOpen(false);
        } catch (err) {
            console.error("Error al guardar partido:", err);
            setError("Error al guardar el partido.");
        }
    };

    if (matchesLoading || teamsLoading) return <div className="p-8 text-center text-slate-500">Cargando calendario de partidos...</div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-primary flex items-center space-x-2">
                        <Calendar className="text-secondary" />
                        <span>Partidos y Calendario</span>
                    </h1>
                    <p className="text-sm text-slate-500 flex items-center space-x-1 mt-1">
                        <Layers size={14} className="text-slate-400" />
                        <span>Liga seleccionada: <strong>{currentLeagueObj?.name}</strong></span>
                    </p>
                </div>
                <button onClick={() => handleOpenModal()} className="btn btn-primary flex items-center space-x-2 w-full sm:w-auto">
                    <Plus size={18} />
                    <span>Programar Partido</span>
                </button>
            </div>

            {/* Listado de partidos */}
            <div className="grid grid-cols-1 gap-4">
                {matches.length > 0 ? (
                    matches.map((match) => {
                        const teamA = teams.find(t => t.id === (match.team_a_id || match.teamAId));
                        const teamB = teams.find(t => t.id === (match.team_b_id || match.teamBId));
                        const setsA = match.score?.setsA ?? match.score?.sets_a ?? 0;
                        const setsB = match.score?.setsB ?? match.score?.sets_b ?? 0;
                        const isFinished = match.status === 'finished';

                        return (
                            <div key={match.id} className="card border border-slate-100 hover:shadow-lg transition-all p-5 flex flex-col md:flex-row items-center justify-between gap-6">
                                {/* Fecha y Ubicación */}
                                <div className="flex items-center space-x-4 shrink-0 text-slate-500 text-sm">
                                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-center min-w-[90px]">
                                        <Calendar size={18} className="mx-auto text-primary mb-1" />
                                        <span className="block font-bold text-slate-700 text-xs">{match.date || 'Por definir'}</span>
                                        <span className="block text-[11px]">{match.time || '--:--'}</span>
                                    </div>
                                    <div className="hidden sm:block">
                                        <span className="inline-block bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded font-medium mb-1">{match.round || 'Jornada'}</span>
                                        <div className="flex items-center space-x-1 text-xs text-slate-400">
                                            <MapPin size={12} />
                                            <span>{match.location || 'Gimnasio Comayagua'}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Marcador / Equipos */}
                                <div className="flex-1 flex items-center justify-center space-x-6 w-full">
                                    {/* Equipo A */}
                                    <div className="flex items-center space-x-3 text-right flex-1 justify-end">
                                        <span className="font-bold text-slate-800 text-base md:text-lg">{teamA?.name || 'Equipo A'}</span>
                                        <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                                            {(teamA?.logo_url || teamA?.logoUrl) ? (
                                                <img src={teamA.logo_url || teamA.logoUrl} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="font-bold text-slate-400 text-xs">A</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Score */}
                                    <div className="bg-slate-900 text-white px-4 py-2 rounded-2xl flex items-center space-x-3 shrink-0 font-extrabold text-xl shadow-inner">
                                        <span>{setsA}</span>
                                        <span className="text-secondary text-sm font-normal">VS</span>
                                        <span>{setsB}</span>
                                    </div>

                                    {/* Equipo B */}
                                    <div className="flex items-center space-x-3 text-left flex-1 justify-start">
                                        <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                                            {(teamB?.logo_url || teamB?.logoUrl) ? (
                                                <img src={teamB.logo_url || teamB.logoUrl} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="font-bold text-slate-400 text-xs">B</span>
                                            )}
                                        </div>
                                        <span className="font-bold text-slate-800 text-base md:text-lg">{teamB?.name || 'Equipo B'}</span>
                                    </div>
                                </div>

                                {/* Acciones */}
                                <div className="flex items-center space-x-3 shrink-0">
                                    {isFinished ? (
                                        <span className="inline-flex items-center space-x-1 text-green-600 bg-green-50 px-3 py-1 rounded-xl text-xs font-bold border border-green-200">
                                            <CheckCircle size={14} />
                                            <span>Finalizado</span>
                                        </span>
                                    ) : (
                                        <Link to={`/scorer/${match.id}`} className="btn btn-secondary text-xs flex items-center space-x-1.5 py-1.5 px-3">
                                            <Play size={14} />
                                            <span>Anotar Partido</span>
                                        </Link>
                                    )}

                                    <button onClick={() => handleOpenModal(match)} className="p-2 text-slate-400 hover:text-primary hover:bg-slate-100 rounded-lg transition-colors">
                                        <Edit2 size={16} />
                                    </button>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="card text-center py-12 text-slate-400">
                        No hay partidos programados en la {currentLeagueObj?.name}. Haz clic en "Programar Partido" para crear uno.
                    </div>
                )}
            </div>

            {/* Modal Programar / Editar Partido */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
                        <h2 className="text-2xl font-bold text-primary">
                            {currentMatch ? 'Editar Partido' : 'Programar Partido'}
                        </h2>

                        {error && <div className="p-3 bg-red-100 text-red-700 text-sm rounded-xl">{error}</div>}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Equipo Local (Equipo A)</label>
                                <select
                                    required
                                    value={formData.team_a_id}
                                    onChange={(e) => setFormData({ ...formData, team_a_id: e.target.value })}
                                    className="input w-full"
                                >
                                    <option value="">Seleccionar Equipo</option>
                                    {teams.map(t => (
                                        <option key={t.id} value={t.id}>{t.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Equipo Visitante (Equipo B)</label>
                                <select
                                    required
                                    value={formData.team_b_id}
                                    onChange={(e) => setFormData({ ...formData, team_b_id: e.target.value })}
                                    className="input w-full"
                                >
                                    <option value="">Seleccionar Equipo</option>
                                    {teams.map(t => (
                                        <option key={t.id} value={t.id}>{t.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Fecha</label>
                                    <input
                                        type="date"
                                        required
                                        value={formData.date}
                                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                        className="input w-full"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Hora</label>
                                    <input
                                        type="time"
                                        required
                                        value={formData.time}
                                        onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                                        className="input w-full"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Lugar / Gimnasio</label>
                                <input
                                    type="text"
                                    value={formData.location}
                                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                    className="input w-full"
                                    placeholder="Ej: Gimnasio León Alvarado"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Jornada / Ronda</label>
                                    <input
                                        type="text"
                                        value={formData.round}
                                        onChange={(e) => setFormData({ ...formData, round: e.target.value })}
                                        className="input w-full"
                                        placeholder="Ej: Jornada 1"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Estado</label>
                                    <select
                                        value={formData.status}
                                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                        className="input w-full"
                                    >
                                        <option value="scheduled">Programado</option>
                                        <option value="in_progress">En Juego</option>
                                        <option value="finished">Finalizado</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="btn border border-slate-300 text-slate-700 bg-white hover:bg-slate-50"
                                >
                                    Cancelar
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    {currentMatch ? 'Guardar Cambios' : 'Crear Partido'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Matches;
