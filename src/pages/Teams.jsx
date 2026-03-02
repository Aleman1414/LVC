import React, { useState } from 'react';
import { useFirestore } from '../hooks/useFirestore';
import { Plus, Edit2, Trash2, Trophy } from 'lucide-react';

const Teams = () => {
    const { data: teams, loading, addData, updateData, deleteData, uploadFile } = useFirestore('teams');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentTeam, setCurrentTeam] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        category: 'Masculino',
        foundationDate: '',
        delegateName: '',
        contact: '',
        status: 'active'
    });
    const [logoFile, setLogoFile] = useState(null);

    const handleOpenModal = (team = null) => {
        if (team) {
            setCurrentTeam(team);
            setFormData({
                name: team.name,
                category: team.category,
                foundationDate: team.foundationDate,
                delegateName: team.delegateName,
                contact: team.contact,
                status: team.status
            });
        } else {
            setCurrentTeam(null);
            setFormData({
                name: '',
                category: 'Masculino',
                foundationDate: '',
                delegateName: '',
                contact: '',
                status: 'active'
            });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            let logoUrl = currentTeam?.logoUrl || '';
            if (logoFile) {
                logoUrl = await uploadFile(logoFile, `logos/${Date.now()}_${logoFile.name}`);
            }

            const teamData = { ...formData, logoUrl };

            if (currentTeam) {
                await updateData(currentTeam.id, teamData);
            } else {
                await addData(teamData);
            }
            setIsModalOpen(false);
            setLogoFile(null);
        } catch (err) {
            console.error("Error saving team:", err);
            alert("Error al guardar el equipo. Posiblemente no tengas permisos de Administrador.");
        }
    };

    if (loading) return <div>Cargando equipos...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Equipos</h1>
                <button onClick={() => handleOpenModal()} className="btn-primary flex items-center space-x-2">
                    <Plus size={20} />
                    <span>Nuevo Equipo</span>
                </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {teams.map((team) => (
                    <div key={team.id} className="card flex flex-col items-center text-center">
                        <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-4 overflow-hidden border-2 border-primary-light">
                            {team.logoUrl ? (
                                <img src={team.logoUrl} alt={team.name} className="w-full h-full object-cover" />
                            ) : (
                                <Trophy size={40} className="text-slate-400" />
                            )}
                        </div>
                        <h3 className="text-xl font-bold">{team.name}</h3>
                        <p className="text-slate-500 mb-4">{team.category}</p>
                        <div className="flex space-x-2 mt-auto">
                            <button
                                onClick={() => handleOpenModal(team)}
                                className="p-2 text-primary hover:bg-slate-100 rounded-full transition-colors"
                                title="Editar"
                            >
                                <Edit2 size={18} />
                            </button>
                            <button
                                onClick={() => deleteData(team.id)}
                                className="p-2 text-secondary hover:bg-slate-100 rounded-full transition-colors"
                                title="Eliminar"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Basic Modal Implementation */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[100]">
                    <div className="bg-white rounded-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
                        <h2 className="text-2xl font-bold mb-4">{currentTeam ? 'Editar Equipo' : 'Nuevo Equipo'}</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Nombre</label>
                                <input
                                    type="text"
                                    required
                                    className="input-field"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Categoría</label>
                                <select
                                    className="input-field"
                                    value={formData.category}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                >
                                    <option>Masculino</option>
                                    <option>Femenino</option>
                                    <option>Mixto</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Logo</label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="input-field"
                                    onChange={(e) => setLogoFile(e.target.files[0])}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Delegado</label>
                                <input
                                    type="text"
                                    className="input-field"
                                    value={formData.delegateName}
                                    onChange={(e) => setFormData({ ...formData, delegateName: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Contacto</label>
                                <input
                                    type="text"
                                    className="input-field"
                                    value={formData.contact}
                                    onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                                />
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

export default Teams;
