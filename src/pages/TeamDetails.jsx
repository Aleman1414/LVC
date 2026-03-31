import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useFirestore } from '../hooks/useFirestore';
import { calculateStandings } from '../services/standingsService';
import { ShieldAlert, Trophy, User, ArrowLeft, ArrowUpRight, Target, Activity, Download } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const TeamDetails = () => {
    const { id: teamId } = useParams();
    const navigate = useNavigate();

    const { data: teams, loading: teamsLoading } = useFirestore('teams');
    const { data: players, loading: playersLoading } = useFirestore('players');
    const { data: matches, loading: matchesLoading } = useFirestore('matches');

    const team = useMemo(() => teams.find(t => t.id === teamId), [teams, teamId]);
    const teamPlayers = useMemo(() => players.filter(p => p.teamId === teamId), [players, teamId]);

    const teamStats = useMemo(() => {
        if (!team || matchesLoading || teamsLoading) return null;
        // calculateStandings expects an array of teams
        const standings = calculateStandings(matches, [team]);
        return standings.length > 0 ? standings[0] : null;
    }, [team, matches, matchesLoading, teamsLoading]);

    const generatePDF = async () => {
        try {
            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.getWidth();

            // Logo Helper Function
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

            // 1. Logo Federación (Izquierda)
            await addLogo('/assets/logos/federacion.png', 14, 10, 25);

            // 2. Logo Equipo (Centro)
            const teamLogoSlug = team.name.replace(/\s+/g, '-');
            const localLogoUrl = `/assets/logos/${teamLogoSlug}.jpg`;
            await addLogo(localLogoUrl, (pageWidth / 2) - 12.5, 10, 25);

            // 3. Logo Liga (Derecha)
            await addLogo('/assets/logos/logo-liga.jpg', pageWidth - 14 - 25, 10, 25);

            // Header
            doc.setFontSize(18);
            doc.setFont("helvetica", "bold");
            doc.text("LIGA DE VOLEIBOL DE COMAYAGUA", pageWidth / 2, 45, { align: 'center' });
            
            doc.setFontSize(14);
            doc.text("REPORTE OFICIAL DE RENDIMIENTO", pageWidth / 2, 53, { align: 'center' });
            
            // Info Box
            doc.setDrawColor(200);
            doc.line(14, 58, pageWidth - 14, 58);
            
            doc.setFontSize(11);
            doc.setFont("helvetica", "normal");
            doc.text(`Equipo: ${team.name}`, 14, 66);
            doc.text(`Categoría: ${team.category}`, 14, 72);
            doc.text(`Generado: ${new Date().toLocaleDateString()}`, pageWidth - 14, 66, { align: 'right' });

            // Stats Table
            doc.setFontSize(14);
            doc.setFont("helvetica", "bold");
            doc.text("Estadísticas del Torneo", 14, 82);

            const statsData = [
                ["PJ", "PG", "PP", "Puntos", "Sets F", "Sets C"],
                [
                    teamStats?.pj || 0,
                    teamStats?.pg || 0,
                    teamStats?.pp || 0,
                    teamStats?.points || 0,
                    teamStats?.setsFavor || 0,
                    teamStats?.setsAgainst || 0
                ]
            ];

            autoTable(doc, {
                startY: 85,
                head: [statsData[0]],
                body: [statsData[1]],
                theme: 'grid',
                headStyles: { fillColor: [180, 0, 0], halign: 'center' },
                styles: { halign: 'center', cellPadding: 3 }
            });

            let finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY : 100;

            // Players Table
            doc.setFontSize(14);
            doc.setFont("helvetica", "bold");
            doc.text("Plantilla de Jugadores", 14, finalY + 15);

            const playersData = teamPlayers.sort((a, b) => (parseInt(a.number) || 0) - (parseInt(b.number) || 0)).map((p, index) => [
                index + 1,
                p.number,
                p.name,
                p.position,
                p.idNumber || 'N/A',
                p.status === 'inactive' ? 'Suspendido' : 'Activo'
            ]);

            autoTable(doc, {
                startY: finalY + 20,
                head: [["#", "Dorsal", "Jugador", "Posición", "Identidad", "Estado"]],
                body: playersData,
                theme: 'striped',
                headStyles: { fillColor: [0, 51, 102], halign: 'center' },
                columnStyles: {
                    0: { cellWidth: 10, halign: 'center' },
                    1: { cellWidth: 15, halign: 'center' },
                    5: { cellWidth: 25, halign: 'center' }
                },
                styles: { fontSize: 9 }
            });

            doc.save(`Reporte_${team.name.replace(/\s+/g, '_')}.pdf`);
        } catch (error) {
            console.error("Error generating PDF:", error);
            alert("Hubo un error al generar el PDF. Revisa la consola para más detalles.");
        }
    };

    if (teamsLoading || playersLoading || matchesLoading) return <div className="p-8 text-center text-slate-500">Cargando reporte del equipo...</div>;
    if (!team) return <div className="p-8 text-center text-red-500 font-bold">Equipo no encontrado.</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <button onClick={() => navigate('/teams')} className="flex items-center text-slate-500 hover:text-primary transition-colors">
                    <ArrowLeft size={20} className="mr-2" />
                    <span>Volver a Equipos</span>
                </button>
                <button onClick={generatePDF} className="flex items-center btn-primary space-x-2">
                    <Download size={18} />
                    <span>Descargar PDF</span>
                </button>
            </div>

            {/* Header / Team Card */}
            <div className="card flex flex-col md:flex-row items-center md:items-start gap-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5">
                    <ShieldAlert size={150} />
                </div>
                <div className="w-32 h-32 bg-slate-100 rounded-2xl flex items-center justify-center p-2 border-2 border-primary-light flex-shrink-0 z-10 bg-white">
                    {team.logoUrl ? (
                        <img src={team.logoUrl} alt={team.name} className="w-full h-full object-contain" />
                    ) : (
                        <Trophy size={50} className="text-slate-400" />
                    )}
                </div>
                <div className="flex-1 text-center md:text-left z-10 w-full mt-2 md:mt-0">
                    <div className="flex flex-col md:flex-row md:justify-between items-center md:items-start w-full">
                        <div>
                            <h1 className="text-4xl font-black text-primary uppercase tracking-tight">{team.name}</h1>
                            <p className="text-lg text-secondary font-bold mt-1">{team.category}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                            <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Delegado</p>
                            <p className="font-semibold mt-1 truncate">{team.delegateName || 'No asignado'}</p>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                            <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Contacto</p>
                            <p className="font-semibold mt-1 truncate">{team.contact || 'No disponible'}</p>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                            <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Fundación</p>
                            <p className="font-semibold mt-1 truncate">{team.foundationDate || 'Desconocida'}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Statistics */}
            <div>
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2"><Activity className="text-secondary" /> Estadísticas del Torneo</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    <div className="card text-center !p-4 bg-gradient-to-br from-primary-dark to-primary text-white border-none shadow-lg">
                        <p className="text-xs uppercase font-bold opacity-80 mb-1">Puntos</p>
                        <p className="text-4xl font-black">{teamStats?.points || 0}</p>
                    </div>
                    <div className="card text-center !p-4 bg-slate-50">
                        <p className="text-xs uppercase font-bold text-slate-500 mb-1">PJ</p>
                        <p className="text-3xl font-black text-slate-800">{teamStats?.pj || 0}</p>
                    </div>
                    <div className="card text-center !p-4 bg-slate-50 border-l-4 border-l-green-500">
                        <p className="text-xs uppercase font-bold text-slate-500 mb-1">Ganados</p>
                        <p className="text-3xl font-black text-green-600">{teamStats?.pg || 0}</p>
                    </div>
                    <div className="card text-center !p-4 bg-slate-50 border-l-4 border-l-red-500">
                        <p className="text-xs uppercase font-bold text-slate-500 mb-1">Perdidos</p>
                        <p className="text-3xl font-black text-red-600">{teamStats?.pp || 0}</p>
                    </div>
                    <div className="card text-center !p-4 bg-slate-50">
                        <p className="text-xs uppercase font-bold text-slate-500 mb-1">Sets Favor</p>
                        <p className="text-3xl font-black text-blue-600">{teamStats?.setsFavor || 0}</p>
                    </div>
                    <div className="card text-center !p-4 bg-slate-50">
                        <p className="text-xs uppercase font-bold text-slate-500 mb-1">Sets Contra</p>
                        <p className="text-3xl font-black text-orange-600">{teamStats?.setsAgainst || 0}</p>
                    </div>
                </div>
            </div>

            {/* Players Breakdown */}
            <div>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold flex items-center gap-2"><Target className="text-primary-light" /> Plantilla de Jugadores</h2>
                    <span className="bg-slate-100 text-primary-dark font-bold px-3 py-1 rounded-full text-sm">
                        {teamPlayers.length} Inscritos
                    </span>
                </div>

                {teamPlayers.length === 0 ? (
                    <div className="bg-slate-50 p-8 rounded-xl border border-slate-200 text-center">
                        <User className="mx-auto text-slate-300 mb-3" size={40} />
                        <p className="text-slate-500 font-medium">Este equipo aún no tiene jugadores registrados.</p>
                        <button onClick={() => navigate('/players')} className="mt-4 btn-secondary text-sm">Ir a Gestión de Jugadores</button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {teamPlayers.map(player => (
                            <div key={player.id} className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 flex items-center space-x-4 hover:shadow-md transition-shadow">
                                <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center overflow-hidden border-2 border-slate-100">
                                    {player.photoUrl ? (
                                        <img src={player.photoUrl} alt={player.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <User size={24} className="text-slate-400" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-slate-800 truncate">{player.name}</h3>
                                    <p className="text-xs font-semibold text-secondary uppercase mt-0.5">{player.position}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className={`w-2 h-2 rounded-full ${player.status === 'inactive' ? 'bg-red-500' : 'bg-green-500'}`}></span>
                                        <span className="text-[10px] text-slate-400 capitalize">{player.status === 'inactive' ? 'Inactivo' : 'Activo'}</span>
                                    </div>
                                </div>
                                <div className="text-2xl font-black text-slate-200">
                                    #{player.number}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default TeamDetails;
