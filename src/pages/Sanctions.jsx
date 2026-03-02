import React, { useState } from 'react';
import { useFirestore } from '../hooks/useFirestore';
import { Plus, Gavel, AlertCircle, ShieldAlert } from 'lucide-react';

const Sanctions = () => {
    const { data: sanctions, loading: sanctionsLoading, addData, deleteData } = useFirestore('sanctions');
    const { data: players } = useFirestore('players');
    const { data: teams } = useFirestore('teams');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        playerId: '',
        type: 'yellow',
        observation: '',
        date: new Date().toISOString().split('T')[0]
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        const player = players.find(p => p.id === formData.playerId);
        try {
            await addData({
                ...formData,
                teamId: player?.teamId || '',
                createdAt: new Date().toISOString()
            });
            setIsModalOpen(false);
        } catch (err) {
            console.error(err);
        }
    };

    const getPlayerName = (id) => players.find(p => p.id === id)?.name || 'Desconocido';
    const getTeamName = (id) => teams.find(t => t.id === id)?.name || 'Desconocido';

    if (sanctionsLoading) return <div>Cargando sanciones...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-primary flex items-center space-x-2">
                    <Gavel className="text-secondary" />
                    <span>Control de Sanciones</span>
                </h1>
                <button onClick={() => setIsModalOpen(true)} className="btn-secondary flex items-center space-x-2">
                    <Plus size={20} />
                    <span>Registrar Sanción</span>
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sanctions.map((sanc) => (
                    <div key={sanc.id} className={`card border-l-8 ${sanc.type === 'yellow' ? 'border-yellow-400' : sanc.type === 'red' ? 'border-red-500' : 'border-slate-800'
                        }`}>
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="font-bold text-lg">{getPlayerName(sanc.playerId)}</h3>
                                <p className="text-sm text-slate-500">{getTeamName(sanc.teamId)}</p>
                            </div>
                            <div className={`p-2 rounded-lg ${sanc.type === 'yellow' ? 'bg-yellow-100' : 'bg-red-100'
                                }`}>
                                {sanc.type === 'yellow' ? <AlertCircle className="text-yellow-600" /> : <ShieldAlert className="text-red-600" />}
                            </div>
                        </div>
                        <p className="text-sm text-slate-600 italic mb-4">"{sanc.observation}"</p>
                        <div className="flex justify-between items-center text-xs text-slate-400">
                            <span>{sanc.date}</span>
                            <button onClick={() => deleteData(sanc.id)} className="text-red-400 hover:text-red-600 font-bold">Eliminar</button>
                        </div>
                    </div>
                ))}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[100]">
                    <div className="bg-white rounded-2xl max-w-lg w-full p-6">
                        <h2 className="text-2xl font-bold mb-4">Registrar Sanción</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Jugador</label>
                                <select required className="input-field" value={formData.playerId} onChange={(e) => setFormData({ ...formData, playerId: e.target.value })}>
                                    <option value="">Seleccionar Jugador</option>
                                    {players.map(p => <option key={p.id} value={p.id}>{p.name} ({getTeamName(p.teamId)})</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Tipo de Sanción</label>
                                <select className="input-field" value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })}>
                                    <option value="yellow">Tarjeta Amarilla</option>
                                    <option value="red">Tarjeta Roja / Expulsión</option>
                                    <option value="suspension">Suspensión Administrativa</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Observación</label>
                                <textarea className="input-field h-24" value={formData.observation} onChange={(e) => setFormData({ ...formData, observation: e.target.value })} placeholder="Detalle de la falta..."></textarea>
                            </div>
                            <div className="flex space-x-3 pt-4">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2 border border-slate-300 rounded-lg">Cancelar</button>
                                <button type="submit" className="flex-1 btn-secondary">Registrar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Sanctions;
