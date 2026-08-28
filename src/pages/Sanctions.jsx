import React, { useState } from 'react';
import { useSupabase } from '../hooks/useSupabase';
import { useLeague } from '../context/LeagueContext';
import { Plus, Gavel, Trash2, Layers } from 'lucide-react';

const Sanctions = () => {
    const { selectedLeague, currentLeagueObj } = useLeague();
    const { data: sanctions, loading: sanctionsLoading, addData, deleteData } = useSupabase('sanctions', { leagueId: selectedLeague });
    const { data: players } = useSupabase('players', { leagueId: selectedLeague });
    const { data: teams } = useSupabase('teams', { leagueId: selectedLeague });

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        player_id: '',
        type: 'yellow',
        reason: '',
        fine: 0,
        date: new Date().toISOString().split('T')[0]
    });
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        const player = players.find(p => p.id === formData.player_id);
        const team_id = player?.team_id || player?.teamId || '';
        try {
            await addData({
                player_id: formData.player_id,
                playerId: formData.player_id,
                team_id: team_id,
                teamId: team_id,
                type: formData.type,
                reason: formData.reason,
                fine: parseFloat(formData.fine) || 0,
                date: formData.date,
                status: 'active',
                league_id: selectedLeague
            });
            setIsModalOpen(false);
        } catch (err) {
            console.error("Error al registrar sanción:", err);
            setError("Error al registrar la sanción.");
        }
    };

    const getPlayerName = (id) => players.find(p => p.id === id)?.name || 'Jugador no encontrado';
    const getTeamName = (id) => teams.find(t => t.id === id)?.name || 'Equipo no encontrado';

    if (sanctionsLoading) return <div className="p-8 text-center text-slate-500">Cargando sanciones...</div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-primary flex items-center space-x-2">
                        <Gavel className="text-secondary" />
                        <span>Control de Sanciones</span>
                    </h1>
                    <p className="text-sm text-slate-500 flex items-center space-x-1 mt-1">
                        <Layers size={14} className="text-slate-400" />
                        <span>Liga seleccionada: <strong>{currentLeagueObj?.name}</strong></span>
                    </p>
                </div>
                <button onClick={() => { setError(''); setIsModalOpen(true); }} className="btn btn-secondary flex items-center space-x-2 w-full sm:w-auto">
                    <Plus size={18} />
                    <span>Registrar Sanción</span>
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sanctions.length > 0 ? (
                    sanctions.map((sanc) => {
                        const playerId = sanc.player_id || sanc.playerId;
                        const teamId = sanc.team_id || sanc.teamId;
                        const isYellow = sanc.type === 'yellow';
                        const isRed = sanc.type === 'red';

                        return (
                            <div key={sanc.id} className={`card border-l-8 hover:shadow-lg transition-all ${isYellow ? 'border-yellow-400' : isRed ? 'border-red-500' : 'border-slate-800'}`}>
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <h3 className="font-bold text-lg text-slate-800">{getPlayerName(playerId)}</h3>
                                        <p className="text-xs font-semibold text-primary">{getTeamName(teamId)}</p>
                                    </div>
                                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${isYellow ? 'bg-yellow-100 text-yellow-800' : isRed ? 'bg-red-100 text-red-800' : 'bg-slate-100 text-slate-800'}`}>
                                        {isYellow ? 'Tarjeta Amarilla' : isRed ? 'Tarjeta Roja' : 'Suspensión'}
                                    </span>
                                </div>

                                <div className="space-y-2 text-sm text-slate-600 bg-slate-50 p-3 rounded-xl mb-4">
                                    <p><strong className="text-slate-700">Motivo:</strong> {sanc.reason || sanc.observation || 'Sin observación'}</p>
                                    <p><strong className="text-slate-700">Fecha:</strong> {sanc.date}</p>
                                    {sanc.fine > 0 && <p><strong className="text-slate-700">Multa:</strong> L. {sanc.fine}</p>}
                                </div>

                                <div className="flex justify-end pt-2 border-t border-slate-100">
                                    <button onClick={() => deleteData(sanc.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Eliminar Sanción">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="col-span-full card text-center py-12 text-slate-400">
                        No hay sanciones registradas en la {currentLeagueObj?.name}.
                    </div>
                )}
            </div>

            {/* Modal Registrar Sanción */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
                        <h2 className="text-2xl font-bold text-primary">Registrar Sanción</h2>

                        {error && <div className="p-3 bg-red-100 text-red-700 text-sm rounded-xl">{error}</div>}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Jugador Sancionado</label>
                                <select
                                    required
                                    value={formData.player_id}
                                    onChange={(e) => setFormData({ ...formData, player_id: e.target.value })}
                                    className="input w-full"
                                >
                                    <option value="">Seleccionar Jugador</option>
                                    {players.map(p => {
                                        const playerTeamId = p.team_id || p.teamId;
                                        const tName = getTeamName(playerTeamId);
                                        return (
                                            <option key={p.id} value={p.id}>{p.name} ({tName})</option>
                                        );
                                    })}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Tarjeta</label>
                                    <select
                                        value={formData.type}
                                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                        className="input w-full"
                                    >
                                        <option value="yellow">Tarjeta Amarilla</option>
                                        <option value="red">Tarjeta Roja</option>
                                        <option value="expulsion">Expulsión / Suspensión</option>
                                    </select>
                                </div>
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
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Multa Económica (Lempiras)</label>
                                <input
                                    type="number"
                                    min="0"
                                    step="10"
                                    value={formData.fine}
                                    onChange={(e) => setFormData({ ...formData, fine: e.target.value })}
                                    className="input w-full"
                                    placeholder="0"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Motivo / Observaciones</label>
                                <textarea
                                    required
                                    rows="3"
                                    value={formData.reason}
                                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                                    className="input w-full"
                                    placeholder="Describa la infracción cometida..."
                                ></textarea>
                            </div>

                            <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="btn border border-slate-300 text-slate-700 bg-white hover:bg-slate-50"
                                >
                                    Cancelar
                                </button>
                                <button type="submit" className="btn btn-secondary">
                                    Guardar Sanción
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Sanctions;
