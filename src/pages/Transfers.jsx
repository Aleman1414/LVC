import React, { useState } from 'react';
import { useSupabase } from '../hooks/useSupabase';
import { useLeague } from '../context/LeagueContext';
import { ArrowRightLeft, Plus, Calendar, Layers, User, Trophy, CheckCircle } from 'lucide-react';

const Transfers = () => {
    const { selectedLeague, currentLeagueObj } = useLeague();
    const { data: transfers, loading: transfersLoading, addData: addTransfer } = useSupabase('transfers', { leagueId: selectedLeague });
    const { data: players, loading: playersLoading, updateData: updatePlayer } = useSupabase('players', { leagueId: selectedLeague });
    const { data: teams, loading: teamsLoading } = useSupabase('teams', { leagueId: selectedLeague });

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedPlayerId, setSelectedPlayerId] = useState('');
    const [toTeamId, setToTeamId] = useState('');
    const [transferDate, setTransferDate] = useState(new Date().toISOString().split('T')[0]);
    const [reason, setReason] = useState('');
    const [error, setError] = useState('');

    const selectedPlayer = players.find(p => p.id === selectedPlayerId);
    const currentTeamId = selectedPlayer ? (selectedPlayer.team_id || selectedPlayer.teamId) : '';
    const currentTeam = teams.find(t => t.id === currentTeamId);

    const availableDestinationTeams = teams.filter(t => t.id !== currentTeamId);

    const handleOpenModal = () => {
        setError('');
        setSelectedPlayerId(players[0]?.id || '');
        setToTeamId('');
        setTransferDate(new Date().toISOString().split('T')[0]);
        setReason('');
        setIsModalOpen(true);
    };

    const handlePlayerChange = (playerId) => {
        setSelectedPlayerId(playerId);
        const player = players.find(p => p.id === playerId);
        const pTeamId = player ? (player.team_id || player.teamId) : '';
        const validDest = teams.find(t => t.id !== pTeamId);
        setToTeamId(validDest?.id || '');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!selectedPlayerId) {
            setError('Debes seleccionar un jugador.');
            return;
        }

        if (!toTeamId) {
            setError('Debes seleccionar el equipo de destino.');
            return;
        }

        if (currentTeamId === toTeamId) {
            setError('El equipo de destino debe ser diferente al equipo actual.');
            return;
        }

        try {
            // 1. Actualizar el equipo del jugador en la tabla players
            await updatePlayer(selectedPlayerId, {
                team_id: toTeamId
            });

            // 2. Registrar la transferencia en la tabla transfers
            await addTransfer({
                player_id: selectedPlayerId,
                from_team_id: currentTeamId || null,
                to_team_id: toTeamId,
                transfer_date: transferDate,
                reason: reason || 'Traspaso de temporada',
                status: 'completed',
                league_id: selectedLeague
            });

            setIsModalOpen(false);
        } catch (err) {
            console.error("Error al procesar traspaso:", err);
            setError("Error al procesar el traspaso del jugador.");
        }
    };

    if (transfersLoading || playersLoading || teamsLoading) return <div className="p-8 text-center text-slate-500">Cargando traspasos...</div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-primary flex items-center space-x-2">
                        <ArrowRightLeft className="text-secondary" />
                        <span>Mercado de Traspasos</span>
                    </h1>
                    <p className="text-sm text-slate-500 flex items-center space-x-1 mt-1">
                        <Layers size={14} className="text-slate-400" />
                        <span>Liga seleccionada: <strong>{currentLeagueObj?.name}</strong></span>
                    </p>
                </div>
                <button onClick={handleOpenModal} className="btn btn-primary flex items-center space-x-2 w-full sm:w-auto">
                    <Plus size={18} />
                    <span>Realizar Traspaso</span>
                </button>
            </div>

            {/* Listado de Traspasos */}
            <div className="grid grid-cols-1 gap-4">
                {transfers.length > 0 ? (
                    transfers.map((tr) => {
                        const player = players.find(p => p.id === (tr.player_id || tr.playerId));
                        const fromTeam = teams.find(t => t.id === (tr.from_team_id || tr.fromTeamId));
                        const toTeam = teams.find(t => t.id === (tr.to_team_id || tr.toTeamId));
                        const photo = player?.photo_url || player?.photoUrl;
                        const fromLogo = fromTeam?.logo_url || fromTeam?.logoUrl;
                        const toLogo = toTeam?.logo_url || toTeam?.logoUrl;

                        return (
                            <div key={tr.id} className="card border border-slate-100 hover:shadow-lg transition-all p-5 flex flex-col md:flex-row items-center justify-between gap-6">
                                {/* Información del Jugador */}
                                <div className="flex items-center space-x-4 min-w-[220px]">
                                    <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                                        {photo ? (
                                            <img src={photo} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <User size={24} className="text-slate-400" />
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-800 text-base">{player?.name || 'Jugador no encontrado'}</h3>
                                        <span className="text-xs text-slate-500 block">Posición: {player?.position || 'N/A'}</span>
                                    </div>
                                </div>

                                {/* Movimiento entre Equipos */}
                                <div className="flex-1 flex items-center justify-center space-x-4 w-full bg-slate-50 p-3 rounded-2xl border border-slate-100">
                                    {/* Equipo Origen */}
                                    <div className="flex items-center space-x-2 text-right justify-end flex-1">
                                        <span className="font-bold text-xs md:text-sm text-slate-700">{fromTeam?.name || 'Libre / Sin equipo'}</span>
                                        <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                                            {fromLogo ? (
                                                <img src={fromLogo} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <Trophy size={14} className="text-slate-400" />
                                            )}
                                        </div>
                                    </div>

                                    {/* Icono de Flecha */}
                                    <div className="p-2 bg-secondary text-white rounded-full shrink-0 shadow-sm">
                                        <ArrowRightLeft size={16} />
                                    </div>

                                    {/* Equipo Destino */}
                                    <div className="flex items-center space-x-2 text-left justify-start flex-1">
                                        <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                                            {toLogo ? (
                                                <img src={toLogo} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <Trophy size={14} className="text-slate-400" />
                                            )}
                                        </div>
                                        <span className="font-bold text-xs md:text-sm text-primary">{toTeam?.name || 'Equipo Destino'}</span>
                                    </div>
                                </div>

                                {/* Detalles y Fecha */}
                                <div className="flex items-center justify-between md:justify-end space-x-4 w-full md:w-auto border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
                                    <div className="text-right">
                                        <div className="flex items-center space-x-1 text-xs text-slate-500 justify-end">
                                            <Calendar size={14} />
                                            <span>{tr.transfer_date || tr.date || 'Sin fecha'}</span>
                                        </div>
                                        <span className="text-[11px] text-slate-400 italic block mt-0.5 max-w-[150px] truncate">{tr.reason || 'Sin motivo especificado'}</span>
                                    </div>
                                    <span className="inline-flex items-center space-x-1 bg-green-50 text-green-700 px-2.5 py-1 rounded-xl text-xs font-bold border border-green-200 shrink-0">
                                        <CheckCircle size={14} />
                                        <span>Oficial</span>
                                    </span>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="card text-center py-12 text-slate-400">
                        No hay traspasos registrados aún en la {currentLeagueObj?.name}. Haz clic en "Realizar Traspaso" para transferir a un jugador de equipo.
                    </div>
                )}
            </div>

            {/* Modal Realizar Traspaso */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
                        <h2 className="text-2xl font-bold text-primary flex items-center space-x-2">
                            <ArrowRightLeft className="text-secondary" size={24} />
                            <span>Realizar Traspaso</span>
                        </h2>

                        {error && <div className="p-3 bg-red-100 border border-red-300 text-red-700 text-sm rounded-xl">{error}</div>}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Seleccionar Jugador</label>
                                <select
                                    required
                                    value={selectedPlayerId}
                                    onChange={(e) => handlePlayerChange(e.target.value)}
                                    className="input w-full"
                                >
                                    <option value="">Seleccionar Jugador</option>
                                    {players.map(p => {
                                        const pTeamId = p.team_id || p.teamId;
                                        const pTeam = teams.find(t => t.id === pTeamId);
                                        return (
                                            <option key={p.id} value={p.id}>{p.name} ({pTeam?.name || 'Sin equipo'})</option>
                                        );
                                    })}
                                </select>
                            </div>

                            {/* Equipo Origen (Auto-detectado) */}
                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                                <span className="text-slate-400 block font-semibold uppercase mb-0.5">Equipo Origen Actual</span>
                                <span className="font-bold text-slate-700 text-sm">{currentTeam?.name || 'Libre / Agente Libre'}</span>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Equipo Destino</label>
                                <select
                                    required
                                    value={toTeamId}
                                    onChange={(e) => setToTeamId(e.target.value)}
                                    className="input w-full"
                                >
                                    <option value="">Seleccionar Equipo Destino</option>
                                    {availableDestinationTeams.map(t => (
                                        <option key={t.id} value={t.id}>{t.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Fecha del Traspaso</label>
                                <input
                                    type="date"
                                    required
                                    value={transferDate}
                                    onChange={(e) => setTransferDate(e.target.value)}
                                    className="input w-full"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Motivo / Observación</label>
                                <input
                                    type="text"
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    className="input w-full"
                                    placeholder="Ej: Acuerdo entre clubes, Traspaso de temporada"
                                />
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
                                    Confirmar Traspaso
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Transfers;
