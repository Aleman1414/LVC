import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSupabase } from '../hooks/useSupabase';
import { useLeague } from '../context/LeagueContext';
import { Plus, Edit2, Trash2, Trophy, Eye, FileText, Download, Layers } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const Teams = () => {
    const { selectedLeague, currentLeagueObj, leagues } = useLeague();
    const { data: teams, loading: teamsLoading, addData, updateData, deleteData, uploadFile } = useSupabase('teams', { leagueId: selectedLeague });
    const { data: players, loading: playersLoading } = useSupabase('players', { leagueId: selectedLeague });
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentTeam, setCurrentTeam] = useState(null);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        name: '',
        category: 'Masculino',
        foundation_date: '',
        delegate_name: '',
        contact: '',
        status: 'active',
        league_id: selectedLeague
    });
    const [logoFile, setLogoFile] = useState(null);

    const handleOpenModal = (team = null) => {
        setError('');
        if (team) {
            setCurrentTeam(team);
            setFormData({
                name: team.name || '',
                category: team.category || 'Masculino',
                foundation_date: team.foundation_date || team.foundationDate || '',
                delegate_name: team.delegate_name || team.delegateName || '',
                contact: team.contact || '',
                status: team.status || 'active',
                league_id: team.league_id || selectedLeague
            });
        } else {
            setCurrentTeam(null);
            setFormData({
                name: '',
                category: 'Masculino',
                foundation_date: '',
                delegate_name: '',
                contact: '',
                status: 'active',
                league_id: selectedLeague
            });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            let logo_url = currentTeam?.logo_url || currentTeam?.logoUrl || '';
            if (logoFile) {
                logo_url = await uploadFile(logoFile, `logos/${Date.now()}_${logoFile.name}`);
            }

            const teamData = {
                name: formData.name,
                category: formData.category,
                foundation_date: formData.foundation_date,
                delegate_name: formData.delegate_name,
                contact: formData.contact,
                status: formData.status,
                league_id: formData.league_id || selectedLeague,
                logo_url: logo_url
            };

            if (currentTeam) {
                await updateData(currentTeam.id, teamData);
            } else {
                await addData(teamData);
            }
            setIsModalOpen(false);
            setLogoFile(null);
        } catch (err) {
            console.error("Error al guardar equipo:", err);
            setError("Error al guardar el equipo.");
        }
    };

    const generateRegistrationPDF = async (team) => {
        const teamPlayers = players.filter(p => (p.team_id || p.teamId) === team.id);
        const doc = jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();

        const addLogo = async (url, x, y, size = 25) => {
            try {
                const img = new Image();
                img.crossOrigin = "Anonymous";
                img.src = url;
                await new Promise((resolve, reject) => {
                    img.onload = resolve;
                    img.onerror = () => reject(new Error(`No se pudo cargar: ${url}`));
                });

                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                const dataUrl = canvas.toDataURL('image/png');
                doc.addImage(dataUrl, 'PNG', x, y, size, size);
            } catch (err) {
                console.warn(err.message);
            }
        };

        await addLogo('/logo.jpg', 14, 10, 22);
        const logoUrl = team.logo_url || team.logoUrl;
        if (logoUrl) {
            await addLogo(logoUrl, pageWidth - 36, 10, 22);
        }

        doc.setFontSize(18);
        doc.setTextColor(15, 23, 42);
        doc.text("HOJA DE INSCRIPCIÓN DE EQUIPO", pageWidth / 2, 18, { align: "center" });

        doc.setFontSize(12);
        doc.setTextColor(30, 58, 138);
        doc.text(`Liga: ${currentLeagueObj?.name || 'LVC'}`, pageWidth / 2, 25, { align: "center" });

        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Generado el: ${new Date().toLocaleDateString('es-HN')}`, pageWidth / 2, 31, { align: "center" });

        doc.setFontSize(11);
        doc.setTextColor(0);
        doc.text(`Nombre del Equipo: ${team.name}`, 14, 42);
        doc.text(`Categoría: ${team.category || 'N/A'}`, 14, 48);
        doc.text(`Delegado: ${team.delegate_name || team.delegateName || 'N/A'}`, 120, 42);
        doc.text(`Contacto: ${team.contact || 'N/A'}`, 120, 48);

        const tableColumn = ["#", "Nombre del Jugador", "Posición", "Núm", "Estado"];
        const tableRows = teamPlayers.map((p, index) => [
            index + 1,
            p.name,
            p.position || 'N/A',
            p.number || 'N/A',
            p.status === 'active' ? 'Activo' : 'Inactivo'
        ]);

        autoTable(doc, {
            startY: 55,
            head: [tableColumn],
            body: tableRows,
            theme: 'grid',
            headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255] },
            styles: { fontSize: 9 }
        });

        doc.save(`Ficha_Inscripcion_${team.name.replace(/\s+/g, '_')}.pdf`);
    };

    const exportToExcel = () => {
        const dataToExport = teams.map(t => {
            const teamPlayers = players.filter(p => (p.team_id || p.teamId) === t.id);
            return {
                'Nombre del Equipo': t.name,
                'Liga': currentLeagueObj?.name || 'LVC',
                'Categoría': t.category,
                'Delegado': t.delegate_name || t.delegateName || '',
                'Contacto': t.contact || '',
                'Total Jugadores': teamPlayers.length,
                'Estado': t.status
            };
        });

        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Equipos");
        XLSX.writeFile(workbook, `Equipos_${currentLeagueObj?.slug || 'LVC'}.xlsx`);
    };

    if (teamsLoading || playersLoading) return <div className="p-8 text-center text-slate-500">Cargando equipos...</div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-primary flex items-center space-x-2">
                        <Trophy className="text-secondary" />
                        <span>Equipos</span>
                    </h1>
                    <p className="text-sm text-slate-500 flex items-center space-x-1 mt-1">
                        <Layers size={14} className="text-slate-400" />
                        <span>Liga seleccionada: <strong>{currentLeagueObj?.name}</strong></span>
                    </p>
                </div>
                <div className="flex items-center space-x-2 w-full sm:w-auto">
                    <button onClick={exportToExcel} className="btn border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 flex items-center space-x-2">
                        <Download size={18} />
                        <span>Exportar Excel</span>
                    </button>
                    <button onClick={() => handleOpenModal()} className="btn btn-primary flex items-center space-x-2">
                        <Plus size={18} />
                        <span>Nuevo Equipo</span>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {teams.length > 0 ? (
                    teams.map((team) => {
                        const teamPlayersCount = players.filter(p => (p.team_id || p.teamId) === team.id).length;
                        const logo = team.logo_url || team.logoUrl;
                        return (
                            <div key={team.id} className="card hover:shadow-xl transition-all border border-slate-100 flex flex-col justify-between">
                                <div>
                                    <div className="flex items-center space-x-4 mb-4">
                                        <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center overflow-hidden border border-slate-200 shrink-0">
                                            {logo ? (
                                                <img src={logo} alt={team.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <Trophy size={28} className="text-slate-400" />
                                            )}
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-bold text-slate-800">{team.name}</h2>
                                            <span className="inline-block bg-slate-100 text-slate-600 text-xs px-2.5 py-0.5 rounded-full font-medium mt-1">
                                                {team.category || 'Categoría Única'}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="space-y-2 text-sm text-slate-600 mb-6 bg-slate-50 p-3 rounded-xl">
                                        <p><strong className="text-slate-700">Delegado:</strong> {team.delegate_name || team.delegateName || 'No asignado'}</p>
                                        <p><strong className="text-slate-700">Contacto:</strong> {team.contact || 'No especificado'}</p>
                                        <p><strong className="text-slate-700">Jugadores registrados:</strong> <span className="font-bold text-primary">{teamPlayersCount}</span></p>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                                    <div className="flex items-center space-x-2">
                                        <Link to={`/teams/${team.id}`} className="p-2 text-slate-500 hover:text-primary hover:bg-slate-100 rounded-lg transition-colors" title="Ver Detalles">
                                            <Eye size={18} />
                                        </Link>
                                        <button onClick={() => generateRegistrationPDF(team)} className="p-2 text-slate-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Descargar Ficha PDF">
                                            <FileText size={18} />
                                        </button>
                                        <button onClick={() => handleOpenModal(team)} className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Editar Equipo">
                                            <Edit2 size={18} />
                                        </button>
                                    </div>
                                    <button onClick={() => deleteData(team.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Eliminar Equipo">
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="col-span-full card text-center py-12 text-slate-400">
                        No hay equipos registrados en la {currentLeagueObj?.name}. Haz clic en "Nuevo Equipo" para registrar el primero.
                    </div>
                )}
            </div>

            {/* Modal de Crear / Editar Equipo */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
                        <h2 className="text-2xl font-bold text-primary">
                            {currentTeam ? 'Editar Equipo' : 'Nuevo Equipo'}
                        </h2>

                        {error && <div className="p-3 bg-red-100 text-red-700 text-sm rounded-xl">{error}</div>}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre del Equipo</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="input w-full"
                                    placeholder="Ej: Warriors LVC"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Liga Pertenece</label>
                                <select
                                    value={formData.league_id}
                                    onChange={(e) => setFormData({ ...formData, league_id: e.target.value })}
                                    className="input w-full"
                                >
                                    {leagues.map(l => (
                                        <option key={l.id || l.slug} value={l.id || l.slug}>{l.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Categoría</label>
                                    <select
                                        value={formData.category}
                                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                        className="input w-full"
                                    >
                                        <option value="Masculino">Masculino</option>
                                        <option value="Femenino">Femenino</option>
                                        <option value="Mixto">Mixto</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Contacto / Teléfono</label>
                                    <input
                                        type="text"
                                        value={formData.contact}
                                        onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                                        className="input w-full"
                                        placeholder="+504 9999-9999"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre del Delegado</label>
                                <input
                                    type="text"
                                    value={formData.delegate_name}
                                    onChange={(e) => setFormData({ ...formData, delegate_name: e.target.value })}
                                    className="input w-full"
                                    placeholder="Nombre del encargado"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Logo del Equipo</label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => setLogoFile(e.target.files[0])}
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
                                    {currentTeam ? 'Guardar Cambios' : 'Crear Equipo'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Teams;
