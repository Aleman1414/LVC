import React, { useState } from 'react';
import { useSupabase } from '../hooks/useSupabase';
import { useLeague } from '../context/LeagueContext';
import { FileText, Plus, Download, Eye, Trash2, Layers } from 'lucide-react';

const Meetings = () => {
    const { selectedLeague, currentLeagueObj } = useLeague();
    const { data: meetings, loading, addData, deleteData, uploadFile } = useSupabase('meetings', { leagueId: selectedLeague });
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({ title: '', description: '', date: '' });
    const [pdfFile, setPdfFile] = useState(null);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            let file_url = '';
            if (pdfFile) {
                file_url = await uploadFile(pdfFile, `documents/${Date.now()}_${pdfFile.name}`);
            }
            await addData({
                title: formData.title,
                description: formData.description,
                date: formData.date,
                file_url: file_url,
                pdfUrl: file_url,
                league_id: selectedLeague
            });
            setIsModalOpen(false);
            setPdfFile(null);
        } catch (err) {
            console.error("Error al subir el acta:", err);
            setError("Error al subir el acta.");
        }
    };

    if (loading) return <div className="p-8 text-center text-slate-500">Cargando actas de reuniones...</div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-primary flex items-center space-x-2">
                        <FileText className="text-secondary" />
                        <span>Actas de Reuniones</span>
                    </h1>
                    <p className="text-sm text-slate-500 flex items-center space-x-1 mt-1">
                        <Layers size={14} className="text-slate-400" />
                        <span>Liga seleccionada: <strong>{currentLeagueObj?.name}</strong></span>
                    </p>
                </div>
                <button onClick={() => { setError(''); setIsModalOpen(true); }} className="btn btn-primary flex items-center space-x-2 w-full sm:w-auto">
                    <Plus size={18} />
                    <span>Subir Nueva Acta</span>
                </button>
            </div>

            <div className="space-y-4">
                {meetings.length > 0 ? (
                    meetings.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)).map((meeting) => {
                        const documentUrl = meeting.file_url || meeting.pdfUrl;
                        return (
                            <div key={meeting.id} className="card flex flex-col sm:flex-row items-center justify-between gap-4 hover:shadow-md transition-shadow">
                                <div className="flex items-center space-x-4 flex-1 w-full sm:w-auto">
                                    <div className="p-3 bg-slate-100 rounded-2xl text-primary shrink-0">
                                        <FileText size={24} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg text-slate-800">{meeting.title}</h3>
                                        <p className="text-sm text-slate-500">{meeting.date || 'Sin fecha'}</p>
                                    </div>
                                </div>

                                <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
                                    {documentUrl && (
                                        <>
                                            <a
                                                href={documentUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="btn border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 flex items-center space-x-1 text-xs py-2 px-3"
                                            >
                                                <Eye size={16} />
                                                <span>Ver</span>
                                            </a>
                                            <a
                                                href={documentUrl}
                                                download
                                                className="btn btn-primary flex items-center space-x-1 text-xs py-2 px-3"
                                            >
                                                <Download size={16} />
                                                <span>Descargar</span>
                                            </a>
                                        </>
                                    )}
                                    <button
                                        onClick={() => {
                                            if (window.confirm('¿Seguro que deseas eliminar esta acta?')) {
                                                deleteData(meeting.id);
                                            }
                                        }}
                                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Eliminar Acta"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="card text-center py-12 text-slate-400">
                        No hay actas publicadas en la {currentLeagueObj?.name}. Haz clic en "Subir Nueva Acta" para publicar una.
                    </div>
                )}
            </div>

            {/* Modal Subir Acta */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
                        <h2 className="text-2xl font-bold text-primary">Subir Nueva Acta</h2>

                        {error && <div className="p-3 bg-red-100 text-red-700 text-sm rounded-xl">{error}</div>}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Título del Documento</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    className="input w-full"
                                    placeholder="Ej: Acta de Reunión Ordinaria #5"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Fecha de la Reunión</label>
                                <input
                                    type="date"
                                    required
                                    value={formData.date}
                                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                    className="input w-full"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Archivo Documento (PDF / Imagen)</label>
                                <input
                                    type="file"
                                    required
                                    accept="application/pdf,image/*"
                                    onChange={(e) => setPdfFile(e.target.files[0])}
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
                                    Publicar Acta
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Meetings;
