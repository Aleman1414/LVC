import React, { useState, useMemo } from 'react';
import { useFirestore } from '../hooks/useFirestore';
import { Plus, Edit2, Trash2, User, Search, Filter } from 'lucide-react';

const Players = () => {
    const { data: players, loading: playersLoading, addData, updateData, deleteData, uploadFile } = useFirestore('players');
    const { data: teams, loading: teamsLoading } = useFirestore('teams');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentPlayer, setCurrentPlayer] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterTeam, setFilterTeam] = useState('all');

    const [formData, setFormData] = useState({
        name: '',
        number: '',
        position: 'Universal',
        age: '',
        idNumber: '',
        status: 'active',
        teamId: ''
    });
    const [photoFile, setPhotoFile] = useState(null);

    const filteredPlayers = useMemo(() => {
        return players.filter(player => {
            const matchesSearch = player.name.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesTeam = filterTeam === 'all' || player.teamId === filterTeam;
            return matchesSearch && matchesTeam;
        });
    }, [players, searchTerm, filterTeam]);

    const handleOpenModal = (player = null) => {
        if (player) {
            setCurrentPlayer(player);
            setFormData({
                name: player.name,
                number: player.number,
                position: player.position,
                age: player.age,
                idNumber: player.idNumber,
                status: player.status,
                teamId: player.teamId
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
                teamId: teams[0]?.id || ''
            });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            // Validation: Check if player already exists in another team by ID or exactly by Name
            const isDuplicate = players.some(p => {
                if (currentPlayer && p.id === currentPlayer.id) return false;
                const sameId = formData.idNumber && p.idNumber === formData.idNumber;
                const sameName = p.name.trim().toLowerCase() === formData.name.trim().toLowerCase();
                return sameId || sameName;
            });

            if (isDuplicate) {
                alert('No se puede guardar: Ya existe un jugador registrado con ese nombre o número de identidad en el sistema.');
                return;
            }

            let photoUrl = currentPlayer?.photoUrl || '';
            if (photoFile) {
                photoUrl = await uploadFile(photoFile, `players/${Date.now()}_${photoFile.name}`);
            }

            const playerData = { ...formData, photoUrl };

            if (currentPlayer) {
                await updateData(currentPlayer.id, playerData);
            } else {
                await addData(playerData);
            }
            setIsModalOpen(false);
            setPhotoFile(null);
        } catch (err) {
            console.error("Error saving player:", err);
        }
    };

    if (playersLoading || teamsLoading) return <div>Cargando...</div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-3xl font-bold text-primary">Jugadores</h1>
                <button onClick={() => handleOpenModal()} className="btn-primary flex items-center space-x-2">
                    <Plus size={20} />
                    <span>Nuevo Jugador</span>
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar por nombre..."
                        className="input-field pl-10"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="relative">
                    <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
                    <select
                        className="input-field pl-10"
                        value={filterTeam}
                        onChange={(e) => setFilterTeam(e.target.value)}
                    >
                        <option value="all">Todos los equipos</option>
                        {teams.map(team => (
                            <option key={team.id} value={team.id}>{team.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredPlayers.map((player) => {
                    const team = teams.find(t => t.id === player.teamId);
                    return (
                        <div key={player.id} className="card relative group">
                            <div className="flex items-center space-x-4">
                                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center overflow-hidden border-2 border-primary-light">
                                    {player.photoUrl ? (
                                        <img src={player.photoUrl} alt={player.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <User size={30} className="text-slate-400" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-lg truncate">{player.name}</h3>
                                    <p className="text-sm text-slate-500 truncate">{team?.name || 'Sin equipo'}</p>
                                </div>
                                <div className="text-xl font-black text-primary opacity-20 group-hover:opacity-100 transition-opacity">
                                    #{player.number}
                                </div>
                            </div>

                            <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center">
                                <span className={`text-xs px-2 py-1 rounded-full font-bold uppercase ${player.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                    }`}>
                                    {player.status === 'active' ? 'Activo' : 'Suspendido'}
                                </span>
                                <div className="flex space-x-2">
                                    <button onClick={() => handleOpenModal(player)} className="text-primary hover:bg-slate-100 p-1 rounded transition-colors"><Edit2 size={16} /></button>
                                    <button onClick={() => deleteData(player.id)} className="text-secondary hover:bg-slate-100 p-1 rounded transition-colors"><Trash2 size={16} /></button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[100]">
                    <div className="bg-white rounded-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
                        <h2 className="text-2xl font-bold mb-4">{currentPlayer ? 'Editar Jugador' : 'Nuevo Jugador'}</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium mb-1">Nombre Completo</label>
                                    <input type="text" required className="input-field" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Número de Camiseta</label>
                                    <input type="number" required className="input-field" value={formData.number} onChange={(e) => setFormData({ ...formData, number: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Posición</label>
                                    <select className="input-field" value={formData.position} onChange={(e) => setFormData({ ...formData, position: e.target.value })}>
                                        <option>Armador</option>
                                        <option>Opuesto</option>
                                        <option>Punta</option>
                                        <option>Central</option>
                                        <option>Libero</option>
                                        <option>Universal</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Edad</label>
                                    <input type="number" className="input-field" value={formData.age} onChange={(e) => setFormData({ ...formData, age: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Identificación</label>
                                    <input type="text" className="input-field" value={formData.idNumber} onChange={(e) => setFormData({ ...formData, idNumber: e.target.value })} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Equipo</label>
                                <select required className="input-field" value={formData.teamId} onChange={(e) => setFormData({ ...formData, teamId: e.target.value })}>
                                    <option value="">Selecciona un equipo</option>
                                    {teams.map(team => (
                                        <option key={team.id} value={team.id}>{team.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Foto</label>
                                <input type="file" accept="image/*" className="input-field" onChange={(e) => setPhotoFile(e.target.files[0])} />
                            </div>
                            <div className="flex space-x-3 pt-4">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50">Cancelar</button>
                                <button type="submit" className="flex-1 btn-primary">Guardar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Players;
