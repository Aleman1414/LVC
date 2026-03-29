import React, { useState } from 'react';
import { useFirestore } from '../hooks/useFirestore';
import { Plus, Calendar, MapPin, Play, CheckCircle, Clock, Edit2 } from 'lucide-react';

const Matches = () => {
    const { data: matches, loading: matchesLoading, addData, updateData } = useFirestore('matches');
    const { data: teams, loading: teamsLoading } = useFirestore('teams');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentMatch, setCurrentMatch] = useState(null);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        teamAId: '',
        teamBId: '',
        date: '',
        time: '',
        location: '',
        status: 'pending',
        setsA: 0,
        setsB: 0
    });

    const handleOpenModal = (match = null) => {
        setError('');
        if (match) {
            setCurrentMatch(match);
            setFormData({
                teamAId: match.teamAId,
                teamBId: match.teamBId,
                date: match.date,
                time: match.time,
                location: match.location,
                status: match.status,
                setsA: match.score?.setsA || 0,
                setsB: match.score?.setsB || 0
            });
        } else {
            setCurrentMatch(null);
            setFormData({
                teamAId: '',
                teamBId: '',
                date: '',
                time: '',
                location: '',
                status: 'pending',
                setsA: 0,
                setsB: 0
            });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const matchData = {
                teamAId: formData.teamAId,
                teamBId: formData.teamBId,
                date: formData.date,
                time: formData.time,
                location: formData.location,
                status: formData.status,
                score: {
                    setsA: parseInt(formData.setsA, 10),
                    setsB: parseInt(formData.setsB, 10),
                    pointsPerSet: [] // Can be expanded later for deep point tracking
                }
            };

            if (currentMatch) {
                await updateData(currentMatch.id, matchData);
            } else {
                await addData({
                    ...matchData,
                    createdAt: new Date().toISOString()
                });
            }
            setIsModalOpen(false);
        } catch (err) {
            console.error(err);
            setError("Error al guardar el partido. Verifica los datos y permisos.");
        }
    };

    const getTeamName = (id) => teams.find(t => t.id === id)?.name || 'Desconocido';

    if (matchesLoading || teamsLoading) return <div>Cargando partidos...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-primary">Calendario de Partidos</h1>
                <button onClick={() => handleOpenModal()} className="btn-primary flex items-center space-x-2">
                    <Plus size={20} />
                    <span>Programar Partido</span>
                </button>
            </div>

            <div className="space-y-4">
                {matches.sort((a, b) => new Date(a.date) - new Date(b.date)).map((match) => (
                    <div key={match.id} className="card flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex items-center space-x-8 flex-1 justify-center md:justify-start">
                            <div className="text-center w-24">
                                <span className="font-bold block truncate">{getTeamName(match.teamAId)}</span>
                                <span className="text-2xl font-black text-primary">{match.score?.setsA || 0}</span>
                            </div>
                            <div className="text-slate-300 font-bold italic">VS</div>
                            <div className="text-center w-24">
                                <span className="font-bold block truncate">{getTeamName(match.teamBId)}</span>
                                <span className="text-2xl font-black text-secondary">{match.score?.setsB || 0}</span>
                            </div>
                        </div>

                        <div className="flex flex-col items-center md:items-end space-y-1 text-sm text-slate-500 min-w-[150px]">
                            <div className="flex items-center space-x-2">
                                <Calendar size={14} />
                                <span>{match.date} {match.time}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                                <MapPin size={14} />
                                <span>{match.location}</span>
                            </div>
                        </div>

                        <div className="flex items-center space-x-2">
                            {match.status === 'pending' && (
                                <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-xs font-bold flex items-center space-x-1">
                                    <Clock size={12} /> <span>Pendiente</span>
                                </span>
                            )}
                            {match.status === 'live' && (
                                <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold flex items-center space-x-1 animate-pulse">
                                    <Play size={12} /> <span>En Vivo</span>
                                </span>
                            )}
                            {match.status === 'finished' && (
                                <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold flex items-center space-x-1">
                                    <CheckCircle size={12} /> <span>Finalizado</span>
                                </span>
                            )}

                            <button onClick={() => handleOpenModal(match)} className="text-primary hover:bg-slate-100 p-2 rounded-full">
                                <Edit2 size={18} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[100]">
                    <div className="bg-white rounded-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
                        <h2 className="text-2xl font-bold mb-4">{currentMatch ? 'Editar Partido/Resultados' : 'Programar Partido'}</h2>
                        
                        {error && (
                            <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-3 mb-4 text-sm rounded flex items-center justify-between">
                                <span>{error}</span>
                                <button onClick={() => setError('')} className="text-red-500 hover:text-red-700">×</button>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Equipo A</label>
                                    <select required className="input-field" value={formData.teamAId} onChange={(e) => setFormData({ ...formData, teamAId: e.target.value })}>
                                        <option value="">Seleccionar</option>
                                        {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Equipo B</label>
                                    <select required className="input-field" value={formData.teamBId} onChange={(e) => setFormData({ ...formData, teamBId: e.target.value })}>
                                        <option value="">Seleccionar</option>
                                        {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Fecha</label>
                                    <input type="date" required className="input-field" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Hora</label>
                                    <input type="time" required className="input-field" value={formData.time} onChange={(e) => setFormData({ ...formData, time: e.target.value })} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Lugar</label>
                                <input type="text" required className="input-field" placeholder="Gimnasio Municipal" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} />
                            </div>

                            {/* ESTADOS Y RESULTADOS PARA EDICIÓN */}
                            {currentMatch && (
                                <div className="border-t border-slate-200 mt-6 pt-4 space-y-4">
                                    <h3 className="font-bold text-lg">Estado y Resultado</h3>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Estado del Partido</label>
                                        <select className="input-field" value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                                            <option value="pending">Pendiente</option>
                                            <option value="live">En Vivo</option>
                                            <option value="finished">Finalizado</option>
                                        </select>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Sets Ganados (A)</label>
                                            <input type="number" min="0" max="3" className="input-field" value={formData.setsA} onChange={(e) => setFormData({ ...formData, setsA: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Sets Ganados (B)</label>
                                            <input type="number" min="0" max="3" className="input-field" value={formData.setsB} onChange={(e) => setFormData({ ...formData, setsB: e.target.value })} />
                                        </div>
                                    </div>
                                    <p className="text-xs text-slate-500 italic">Nota: Al marcar como "Finalizado", la tabla de posiciones se actualizará automáticamente basándose en los sets definidos arriba (0 a 3).</p>
                                </div>
                            )}

                            <div className="flex space-x-3 pt-4">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2 border border-slate-300 rounded-lg">Cancelar</button>
                                <button type="submit" className="flex-1 btn-primary">Guardar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Matches;
