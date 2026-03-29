import React, { useState } from 'react';
import { useFirestore } from '../hooks/useFirestore';
import { FileText, Plus, Download, Eye, Trash2 } from 'lucide-react';

const Meetings = () => {
    const { data: meetings, loading, addData, deleteData, uploadFile } = useFirestore('meetings');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({ title: '', description: '', date: '' });
    const [pdfFile, setPdfFile] = useState(null);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            let pdfUrl = '';
            if (pdfFile) {
                pdfUrl = await uploadFile(pdfFile, `meetings/${Date.now()}_${pdfFile.name}`);
            }
            await addData({ ...formData, pdfUrl, createdAt: new Date().toISOString() });
            setIsModalOpen(false);
            setPdfFile(null);
        } catch (err) {
            console.error(err);
            setError("Error al subir el acta. Verifica el archivo y permisos.");
        }
    };

    if (loading) return <div>Cargando actas...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-primary flex items-center space-x-2">
                    <FileText className="text-secondary" />
                    <span>Actas de Reuniones</span>
                </h1>
                <button onClick={() => { setError(''); setIsModalOpen(true); }} className="btn-primary flex items-center space-x-2">
                    <Plus size={20} />
                    <span>Subir Acta</span>
                </button>
            </div>

            <div className="space-y-4">
                {meetings.sort((a, b) => new Date(b.date) - new Date(a.date)).map((meeting) => (
                    <div key={meeting.id} className="card flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center space-x-4 flex-1">
                            <div className="p-3 bg-slate-100 rounded-lg text-primary">
                                <FileText size={24} />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg">{meeting.title}</h3>
                                <p className="text-sm text-slate-500">{meeting.date}</p>
                            </div>
                        </div>

                        <div className="flex space-x-2">
                            <a
                                href={meeting.pdfUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="btn-primary bg-slate-100 !text-primary hover:bg-slate-200 flex items-center space-x-2"
                            >
                                <Eye size={18} />
                                <span>Ver</span>
                            </a>
                            <a
                                href={meeting.pdfUrl}
                                download
                                className="btn-primary flex items-center space-x-2"
                            >
                                <Download size={18} />
                                <span>Descargar</span>
                            </a>
                            <button
                                onClick={() => {
                                    if (window.confirm('¿Seguro que deseas eliminar esta acta?')) {
                                        deleteData(meeting.id);
                                    }
                                }}
                                className="bg-red-50 text-red-600 hover:bg-red-100 p-2 rounded-lg flex items-center justify-center transition-colors"
                                title="Eliminar Acta"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[100]">
                    <div className="bg-white rounded-2xl max-w-lg w-full p-6">
                        <h2 className="text-2xl font-bold mb-4">Subir Nueva Acta</h2>
                        
                        {error && (
                            <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-3 mb-4 text-sm rounded flex items-center justify-between">
                                <span>{error}</span>
                                <button onClick={() => setError('')} className="text-red-500 hover:text-red-700">×</button>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Título</label>
                                <input type="text" required className="input-field" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Fecha</label>
                                <input type="date" required className="input-field" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Archivo PDF</label>
                                <input type="file" required accept="application/pdf" className="input-field" onChange={(e) => setPdfFile(e.target.files[0])} />
                            </div>
                            <div className="flex space-x-3 pt-4">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2 border border-slate-300 rounded-lg">Cancelar</button>
                                <button type="submit" className="flex-1 btn-primary">Subir</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Meetings;
