import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSupabase } from '../hooks/useSupabase';
import { calculateStandings } from '../services/standingsService';
import { Trophy, User, ArrowLeft, Download } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const TeamDetails = () => {
    const { id: teamId } = useParams();
    const navigate = useNavigate();

    const { data: teams, loading: teamsLoading } = useSupabase('teams');
    const { data: players, loading: playersLoading } = useSupabase('players');
    const { data: matches, loading: matchesLoading } = useSupabase('matches');

    const team = useMemo(() => teams.find(t => t.id === teamId), [teams, teamId]);
    const teamPlayers = useMemo(() => players.filter(p => (p.team_id || p.teamId) === teamId), [players, teamId]);

    const teamStats = useMemo(() => {
        if (!team || matchesLoading || teamsLoading) return null;
        const standings = calculateStandings(matches || [], [team]);
        return standings.length > 0 ? standings[0] : null;
    }, [team, matches, matchesLoading, teamsLoading]);

    const generatePDF = async () => {
        if (!team) return;
        try {
            const doc = new jsPDF();
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
            doc.text(`PLAN TÁCTICO Y FICHA - ${team.name.toUpperCase()}`, pageWidth / 2, 20, { align: "center" });

            doc.setFontSize(10);
            doc.text(`Categoría: ${team.category || 'N/A'} | Delegado: ${team.delegate_name || team.delegateName || 'N/A'}`, pageWidth / 2, 28, { align: "center" });

            const tableColumn = ["#", "Jugador", "Posición", "Camiseta", "Estado"];
            const tableRows = teamPlayers.map((p, index) => [
                index + 1,
                p.name,
                p.position || 'N/A',
                p.number || 'N/A',
                p.status === 'active' ? 'Activo' : 'Inactivo'
            ]);

            autoTable(doc, {
                startY: 38,
                head: [tableColumn],
                body: tableRows,
                theme: 'grid',
                headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255] }
            });

            doc.save(`Detalles_${team.name.replace(/\s+/g, '_')}.pdf`);
        } catch (err) {
            console.error(err);
        }
    };

    if (teamsLoading || playersLoading || matchesLoading) return <div className="p-8 text-center text-slate-500">Cargando datos del equipo...</div>;
    if (!team) return <div className="p-8 text-center text-red-500">Equipo no encontrado.</div>;

    const logo = team.logo_url || team.logoUrl;

    return (
        <div className="space-y-6">
            <button onClick={() => navigate('/teams')} className="btn border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 flex items-center space-x-2 text-sm">
                <ArrowLeft size={16} />
                <span>Volver a Equipos</span>
            </button>

            {/* Cabecera del Equipo */}
            <div className="card flex flex-col md:flex-row items-center justify-between gap-6 border-l-8 border-primary">
                <div className="flex items-center space-x-5">
                    <div className="w-20 h-20 rounded-2xl bg-slate-100 flex items-center justify-center overflow-hidden border border-slate-200 shrink-0">
                        {logo ? (
                            <img src={logo} alt={team.name} className="w-full h-full object-cover" />
                        ) : (
                            <Trophy size={36} className="text-slate-400" />
                        )}
                    </div>
                    <div>
                        <h1 className="text-3xl font-extrabold text-slate-800">{team.name}</h1>
                        <p className="text-sm text-slate-500 mt-1">Categoría: <strong className="text-primary">{team.category}</strong></p>
                        <p className="text-xs text-slate-400 mt-0.5">Delegado: {team.delegate_name || team.delegateName || 'No asignado'}</p>
                    </div>
                </div>

                <button onClick={generatePDF} className="btn btn-primary flex items-center space-x-2">
                    <Download size={18} />
                    <span>Exportar Ficha PDF</span>
                </button>
            </div>

            {/* Estadísticas rápidas */}
            {teamStats && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="card text-center p-4 bg-slate-50 border border-slate-100">
                        <span className="text-xs text-slate-400 font-semibold block uppercase">Partidos Jugados</span>
                        <span className="text-2xl font-bold text-slate-800">{teamStats.pj}</span>
                    </div>
                    <div className="card text-center p-4 bg-green-50 border border-green-100">
                        <span className="text-xs text-green-600 font-semibold block uppercase">Victorias</span>
                        <span className="text-2xl font-bold text-green-700">{teamStats.pg}</span>
                    </div>
                    <div className="card text-center p-4 bg-red-50 border border-red-100">
                        <span className="text-xs text-red-500 font-semibold block uppercase">Derrotas</span>
                        <span className="text-2xl font-bold text-red-700">{teamStats.pp}</span>
                    </div>
                    <div className="card text-center p-4 bg-primary/10 border border-primary/20">
                        <span className="text-xs text-primary font-semibold block uppercase">Puntos Totales</span>
                        <span className="text-2xl font-extrabold text-primary">{teamStats.points}</span>
                    </div>
                </div>
            )}

            {/* Nómina de Jugadores */}
            <div className="card space-y-4">
                <h2 className="text-xl font-bold text-primary flex items-center space-x-2">
                    <User size={20} className="text-secondary" />
                    <span>Nómina de Jugadores ({teamPlayers.length})</span>
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {teamPlayers.length > 0 ? (
                        teamPlayers.map((player) => {
                            const photo = player.photo_url || player.photoUrl;
                            return (
                                <div key={player.id} className="flex items-center space-x-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                                    <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center overflow-hidden border border-slate-200 shrink-0">
                                        {photo ? (
                                            <img src={photo} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <User size={18} className="text-slate-400" />
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-sm text-slate-800">{player.name}</h3>
                                        <p className="text-xs text-slate-500">{player.position} #{player.number || 'SN'}</p>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <p className="col-span-full text-slate-400 italic text-sm text-center py-6">No hay jugadores inscritos en este equipo aún.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TeamDetails;
