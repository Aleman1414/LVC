import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useFirestore } from '../hooks/useFirestore';
import { Plus, Edit2, Trash2, Trophy, Eye, FileText } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const Teams = () => {
    const { data: teams, loading: teamsLoading, addData, updateData, deleteData, uploadFile } = useFirestore('teams');
    const { data: players, loading: playersLoading } = useFirestore('players');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentTeam, setCurrentTeam] = useState(null);
    const [error, setError] = useState('');
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
        setError('');
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
            setError("Error al guardar el equipo. Posiblemente no tengas permisos de Administrador.");
        }
    };
    
    const generateRegistrationPDF = async (team) => {
        const teamPlayers = players.filter(p => p.teamId === team.id);
        const doc = jsPDF();

        // Try to add logo
        if (team.logoUrl) {
            try {
                const img = new Image();
                img.crossOrigin = "Anonymous";
                img.src = team.logoUrl;
                await new Promise((resolve, reject) => {
                    img.onload = resolve;
                    img.onerror = reject;
                });

                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                const dataUrl = canvas.toDataURL('image/png');

                doc.addImage(dataUrl, 'PNG', 160, 10, 30, 30);
            } catch (imgError) {
                console.error("No se pudo cargar el logo para el PDF", imgError);
            }
        }

        // Header
        doc.setFontSize(20);
        doc.text("FICHA DE INSCRIPCIÓN", 14, 20);
        
        doc.setFontSize(14);
        doc.text(`Equipo: ${team.name}`, 14, 35);
        doc.text(`Categoría: ${team.category}`, 14, 43);
        doc.text(`Delegado: ${team.delegateName || 'N/A'}`, 14, 51);
        
        doc.setFontSize(10);
        doc.text(`Fecha de reporte: ${new Date().toLocaleDateString()}`, 14, 60);

        const playersData = teamPlayers.map((p, index) => [
            index + 1,
            p.number,
            p.name,
            p.idNumber || 'N/A',
            p.position,
            p.status === 'inactive' ? 'Inactivo' : 'Activo'
        ]);

        autoTable(doc, {
            startY: 65,
            head: [["#", "Dorsal", "Nombre Completo", "Identidad", "Posición", "Estado"]],
            body: playersData,
            theme: 'grid',
            headStyles: { fillColor: [0, 51, 102] },
            styles: { fontSize: 9 }
        });

        const finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY : 100;
        
        doc.setFontSize(10);
        doc.text("__________________________", 40, finalY + 30);
        doc.text("Firma del Delegado", 45, finalY + 35);
        
        doc.text("__________________________", 130, finalY + 30);
        doc.text("Sello de la League", 140, finalY + 35);

        doc.save(`Inscripcion_${team.name.replace(/\s+/g, '_')}.pdf`);
    };

    if (teamsLoading || playersLoading) return <div>Cargando equipos...</div>;

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
                            <Link
                                to={`/teams/${team.id}`}
                                className="p-2 text-blue-500 hover:bg-slate-100 rounded-full transition-colors"
                                title="Ver Reporte"
                            >
                                <Eye size={18} />
                            </Link>
                            <button
                                onClick={() => generateRegistrationPDF(team)}
                                className="p-2 text-green-600 hover:bg-slate-100 rounded-full transition-colors"
                                title="Inscripción (PDF)"
                            >
                                <FileText size={18} />
                            </button>
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
                        
                        {error && (
                            <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-3 mb-4 text-sm rounded flex items-center justify-between">
                                <span>{error}</span>
                                <button onClick={() => setError('')} className="text-red-500 hover:text-red-700">×</button>
                            </div>
                        )}

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
