import React, { useState, useMemo } from 'react';
import { useSupabase } from '../hooks/useSupabase';
import { useLeague } from '../context/LeagueContext';
import { Plus, Edit2, Trash2, User, Search, Filter, Layers, ArrowRightLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const Players = () => {
    const { selectedLeague, currentLeagueObj } = useLeague();
    const { data: players, loading: playersLoading, addData, updateData, deleteData, uploadFile } = useSupabase('players', { leagueId: selectedLeague });
    const { data: teams, loading: teamsLoading } = useSupabase('teams', { leagueId: selectedLeague });

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentPlayer, setCurrentPlayer] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterTeam, setFilterTeam] = useState('all');
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        name: '',
        number: '',
        position: 'Universal',
        age: '',
        idNumber: '',
        status: 'active',
        team_id: ''
    });
    const [photoFile, setPhotoFile] = useState(null);

    const filteredPlayers = useMemo(() => {
        return players.filter(player => {
            const matchesSearch = (player.name || '').toLowerCase().includes(searchTerm.toLowerCase());
            const playerTeamId = player.team_id || player.teamId;
            const matchesTeam = filterTeam === 'all' || playerTeamId === filterTeam;
            return matchesSearch && matchesTeam;
        });
    }, [players, searchTerm, filterTeam]);

    const handleOpenModal = (player = null) => {
        setError('');
        if (player) {
            setCurrentPlayer(player);
            setFormData({
                name: player.name || '',
                number: player.number || '',
                position: player.position || 'Universal',
                age: player.age || '',
                idNumber: player.id_number || player.idNumber || '',
                status: player.status || 'active',
                team_id: player.team_id || player.teamId || ''
            });
        } else {
            setCurrentPlayer(null);
            setFormData({
                name: '',
                number: '',
                position: 'Universal',
                age: '',
                idNumber: '',
                status: 'active',
                team_id: teams[0]?.id || ''
            });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        const normalizedName = (formData.name || '').trim().toLowerCase();

        // 1. Validación de Duplicados: Verificar si el jugador ya existe en la lista
        const existingPlayer = players.find(p =>
            (p.name || '').trim().toLowerCase() === normalizedName &&
            (!currentPlayer || p.id !== currentPlayer.id)
        );

        if (existingPlayer) {
            const existingTeamId = existingPlayer.team_id || existingPlayer.teamId;
            const existingTeam = teams.find(t => t.id === existingTeamId);
            const teamName = existingTeam?.name || 'otro equipo';
            setError(`⚠️ El jugador "${formData.name}" ya se encuentra registrado en el equipo "${teamName}". No se permiten jugadores duplicados ni pertenecer a múltiples equipos. Para cambiarlo de equipo debes utilizar el apartado de "Traspasos".`);
            return;
        }

        // 2. Validación de Cambio de Equipo directo en edición
        if (currentPlayer) {
            const originalTeamId = currentPlayer.team_id || currentPlayer.teamId;
            if (originalTeamId && formData.team_id && originalTeamId !== formData.team_id) {
                setError(`⚠️ No está permitido cambiar a un jugador de equipo directamente en la edición. Para realizar una transferencia a otro equipo utiliza el apartado de "Traspasos".`);
                return;
            }
        }

        try {
            let photo_url = currentPlayer?.photo_url || currentPlayer?.photoUrl || '';
            if (photoFile) {
                photo_url = await uploadFile(photoFile, `players/${Date.now()}_${photoFile.name}`);
            }

            const playerData = {
                name: formData.name.trim(),
                number: formData.number ? parseInt(formData.number, 10) : null,
                position: formData.position,
                status: formData.status,
                team_id: formData.team_id || teams[0]?.id || null,
                photo_url: photo_url,
                league_id: selectedLeague
            };

            if (currentPlayer) {
                await updateData(currentPlayer.id, playerData);
            } else {
                await addData(playerData);
            }
            setIsModalOpen(false);
            setPhotoFile(null);
        } catch (err) {
            console.error("Error al guardar jugador:", err);
            setError("Error al guardar el jugador. Inténtalo de nuevo.");
        }
    };

    if (playersLoading || teamsLoading) return <div className="p-8 text-center text-slate-500">Cargando jugadores...</div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-primary flex items-center space-x-2">
                        <User className="text-secondary" />
                        <span>Jugadores</span>
                    </h1>
                    <p className="text-sm text-slate-500 flex items-center space-x-1 mt-1">
                        <Layers size={14} className="text-slate-400" />
                        <span>Liga seleccionada: <strong>{currentLeagueObj?.name}</strong></span>
                    </p>
                </div>
                <div className="flex items-center space-x-3 w-full sm:w-auto">
                    <Link to="/transfers" className="btn border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 flex items-center space-x-2">
                        <ArrowRightLeft size={18} />
                        <span>Ir a Traspasos</span>
                    </Link>
                    <button onClick={() => handleOpenModal()} className="btn btn-primary flex items-center space-x-2">
                        <Plus size={18} />
                        <span>Nuevo Jugador</span>
                    </button>
                </div>
            </div>

            {/* Filtros y búsqueda */}
            <div className="card grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="relative">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Buscar por nombre..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="input w-full pl-10"
                    />
                </div>

                <div className="relative flex items-center">
                    <Filter size={18} className="absolute left-3 text-slate-400" />
                    <select
                        value={filterTeam}
                        onChange={(e) => setFilterTeam(e.target.value)}
                        className="input w-full pl-10"
                    >
                        <option value="all">Todos los Equipos</option>
                        {teams.map(t => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Grid de Jugadores */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredPlayers.length > 0 ? (
                    filteredPlayers.map((player) => {
                        const playerTeamId = player.team_id || player.teamId;
                        const team = teams.find(t => t.id === playerTeamId);
                        const photo = player.photo_url || player.photoUrl;
                        return (
                            <div key={player.id} className="card hover:shadow-lg transition-all border border-slate-100 flex flex-col justify-between">
                                <div>
                                    <div className="flex items-center space-x-4 mb-4">
                                        <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center overflow-hidden border border-slate-200 shrink-0">
                                            {photo ? (
                                                <img src={photo} alt={player.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <User size={28} className="text-slate-400" />
                                            )}
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-bold text-slate-800 line-clamp-1">{player.name}</h2>
                                            <p className="text-xs text-primary font-semibold">{team?.name || 'Sin equipo'}</p>
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl text-xs text-slate-600 mb-4">
                                        <div>
                                            <span className="text-slate-400 block">Posición</span>
                                            <span className="font-bold text-slate-700">{player.position || 'N/A'}</span>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-slate-400 block">Camiseta</span>
                                            <span className="font-extrabold text-secondary text-sm">#{player.number || 'SN'}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                                    <button onClick={() => handleOpenModal(player)} className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Editar Jugador">
                                        <Edit2 size={16} />
                                    </button>
                                    <button onClick={() => deleteData(player.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Eliminar Jugador">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="col-span-full card text-center py-12 text-slate-400">
                        No se encontraron jugadores registrados para esta liga o filtro.
                    </div>
                )}
            </div>

            {/* Modal Crear / Editar Jugador */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
                        <h2 className="text-2xl font-bold text-primary">
                            {currentPlayer ? 'Editar Jugador' : 'Nuevo Jugador'}
                        </h2>

                        {error && <div className="p-3 bg-red-100 border border-red-300 text-red-700 text-sm rounded-xl">{error}</div>}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre Completo</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="input w-full"
                                    placeholder="Nombre y Apellido"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Equipo Pertenece</label>
                                <select
                                    value={formData.team_id}
                                    onChange={(e) => setFormData({ ...formData, team_id: e.target.value })}
                                    className="input w-full"
                                    required
                                    disabled={!!currentPlayer} // Bloquear cambio directo de equipo en edición
                                >
                                    <option value="">Seleccionar Equipo</option>
                                    {teams.map(t => (
                                        <option key={t.id} value={t.id}>{t.name}</option>
                                    ))}
                                </select>
                                {currentPlayer && (
                                    <p className="text-[11px] text-slate-400 mt-1">Para transferir a este jugador a otro equipo, utiliza el apartado de <strong>Traspasos</strong>.</p>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Número de Camiseta</label>
                                    <input
                                        type="number"
                                        value={formData.number}
                                        onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                                        className="input w-full"
                                        placeholder="Ej: 10"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Posición</label>
                                    <select
                                        value={formData.position}
                                        onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                                        className="input w-full"
                                    >
                                        <option value="Colocador/Armador">Colocador/Armador</option>
                                        <option value="Opuesto">Opuesto</option>
                                        <option value="Central">Central</option>
                                        <option value="Punta/Receptor">Punta/Receptor</option>
                                        <option value="Líbero">Líbero</option>
                                        <option value="Universal">Universal</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Foto del Jugador</label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => setPhotoFile(e.target.files[0])}
                                    className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
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
                                    {currentPlayer ? 'Guardar Cambios' : 'Registrar Jugador'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Players;
