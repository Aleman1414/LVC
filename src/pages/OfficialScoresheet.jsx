import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useSupabase } from '../hooks/useSupabase';
import { useAuth } from '../context/AuthContext';
import {
    createDefaultScoresheet,
    createDefaultSetState,
    isExperimentalLeague
} from '../utils/officialScoresheetUtils';
import { exportFIVBScoresheetPDF } from '../utils/fivbPdfExport';
import {
    Trophy,
    ArrowLeft,
    Save,
    RotateCw,
    Users,
    ClipboardList,
    AlertTriangle,
    Download,
    Eye,
    CheckCircle,
    Play,
    Plus,
    Minus,
    Clock,
    FileText,
    ChevronRight,
    Flag,
    Shield
} from 'lucide-react';

const OfficialScoresheet = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { canEdit, isDelegate } = useAuth();

    const { data: matches, updateData } = useSupabase('matches');
    const { data: teams } = useSupabase('teams');
    const { data: allPlayers } = useSupabase('players');

    const match = matches.find(m => m.id === id);
    const teamAId = match?.team_a_id || match?.teamAId;
    const teamBId = match?.team_b_id || match?.teamBId;

    const teamA = teams.find(t => t.id === teamAId);
    const teamB = teams.find(t => t.id === teamBId);

    // Filter players belonging to each team
    const playersA = useMemo(() => {
        return allPlayers.filter(p => (p.team_id || p.teamId) === teamAId);
    }, [allPlayers, teamAId]);

    const playersB = useMemo(() => {
        return allPlayers.filter(p => (p.team_id || p.teamId) === teamBId);
    }, [allPlayers, teamBId]);

    // Active Tab: 'live' (Mesa en Vivo), 'sheet' (Hoja FIVB), 'roster' (Alineación y Oficiales), 'sanctions' (Sanciones)
    const [activeTab, setActiveTab] = useState('live');
    const [currentSetIdx, setCurrentSetIdx] = useState(0); // 0 to 4 (Sets 1 to 5)

    // Scoresheet data state
    const [scoresheet, setScoresheet] = useState(null);
    const [saving, setSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState('');
    const [error, setError] = useState('');

    // Load initial scoresheet from match.score.officialScoresheet if exists, or initialize
    useEffect(() => {
        if (!match) return;

        if (match.score?.officialScoresheet) {
            setScoresheet(match.score.officialScoresheet);
        } else {
            const initial = createDefaultScoresheet(match, teamA, teamB);
            // Pre-fill roster with known players if empty
            if (playersA.length > 0) {
                initial.rosterA.players = playersA.map(p => ({
                    number: p.number !== null && p.number !== undefined ? String(p.number) : '',
                    name: p.name
                }));
            }
            if (playersB.length > 0) {
                initial.rosterB.players = playersB.map(p => ({
                    number: p.number !== null && p.number !== undefined ? String(p.number) : '',
                    name: p.name
                }));
            }
            setScoresheet(initial);
        }
    }, [match, teamA, teamB, playersA, playersB]);

    // Current set helper
    const currentSet = scoresheet?.sets?.[currentSetIdx] || createDefaultSetState(currentSetIdx + 1);
    const isFifthSet = currentSetIdx === 4;
    const setTarget = isFifthSet ? 15 : 25;

    // Evaluate current set winner
    const currentSetWonA = currentSet.teamA.points >= setTarget && (currentSet.teamA.points - currentSet.teamB.points >= 2);
    const currentSetWonB = currentSet.teamB.points >= setTarget && (currentSet.teamB.points - currentSet.teamA.points >= 2);

    // Count sets won
    const setsWon = useMemo(() => {
        if (!scoresheet?.sets) return { a: 0, b: 0 };
        let a = 0;
        let b = 0;
        scoresheet.sets.forEach((st, idx) => {
            const target = idx === 4 ? 15 : 25;
            const ptsA = st.teamA?.points || 0;
            const ptsB = st.teamB?.points || 0;
            if (ptsA >= target && ptsA - ptsB >= 2) a++;
            else if (ptsB >= target && ptsB - ptsA >= 2) b++;
        });
        return { a, b };
    }, [scoresheet]);

    // --- Scoring Actions ---
    const handleAddPoint = (team) => {
        if (!canEdit) return;
        setScoresheet(prev => {
            const next = JSON.parse(JSON.stringify(prev));
            const st = next.sets[currentSetIdx];
            const targetTeam = team === 'A' ? st.teamA : st.teamB;
            const newPt = (targetTeam.points || 0) + 1;
            targetTeam.points = newPt;
            if (!targetTeam.slashedPoints) targetTeam.slashedPoints = [];
            if (!targetTeam.slashedPoints.includes(newPt)) {
                targetTeam.slashedPoints.push(newPt);
            }

            // 5th set: Check change of courts at 8 points
            if (isFifthSet && !st.fifthSetChangeCourt?.swappedAt) {
                if (newPt === 8) {
                    st.fifthSetChangeCourt = {
                        pointsAtChange: newPt,
                        swappedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    };
                }
            }

            return next;
        });
    };

    const handleSubtractPoint = (team) => {
        if (!canEdit) return;
        setScoresheet(prev => {
            const next = JSON.parse(JSON.stringify(prev));
            const st = next.sets[currentSetIdx];
            const targetTeam = team === 'A' ? st.teamA : st.teamB;
            if ((targetTeam.points || 0) > 0) {
                const oldPt = targetTeam.points;
                targetTeam.points = oldPt - 1;
                targetTeam.slashedPoints = (targetTeam.slashedPoints || []).filter(p => p !== oldPt);
            }
            return next;
        });
    };

    // Record Timeout (T)
    const handleRecordTimeout = (team) => {
        if (!canEdit) return;
        setScoresheet(prev => {
            const next = JSON.parse(JSON.stringify(prev));
            const st = next.sets[currentSetIdx];
            const targetTeam = team === 'A' ? st.teamA : st.teamB;
            const ptsA = st.teamA.points || 0;
            const ptsB = st.teamB.points || 0;
            const formattedScore = team === 'A' ? `${ptsA}:${ptsB}` : `${ptsB}:${ptsA}`;

            if (!targetTeam.timeouts[0]) {
                targetTeam.timeouts[0] = formattedScore;
            } else if (!targetTeam.timeouts[1]) {
                targetTeam.timeouts[1] = formattedScore;
            } else {
                alert('Ambos tiempos fuera (2) ya han sido utilizados por este equipo en el set actual.');
            }
            return next;
        });
    };

    // Record Substitution
    const handleRecordSubstitution = (team, posIdx, playerOut, playerIn) => {
        if (!canEdit) return;
        setScoresheet(prev => {
            const next = JSON.parse(JSON.stringify(prev));
            const st = next.sets[currentSetIdx];
            const targetTeam = team === 'A' ? st.teamA : st.teamB;
            const ptsA = st.teamA.points || 0;
            const ptsB = st.teamB.points || 0;
            const formattedScore = team === 'A' ? `${ptsA}:${ptsB}` : `${ptsB}:${ptsA}`;

            targetTeam.substitutes[posIdx] = playerIn;
            targetTeam.subScores[posIdx] = formattedScore;
            return next;
        });
    };

    // Record Sanction
    const handleAddSanction = (newSanction) => {
        if (!canEdit) return;
        setScoresheet(prev => {
            const next = JSON.parse(JSON.stringify(prev));
            next.sanctions.push(newSanction);

            // FIVB Rule 3.8.b.2: Penalty 'P' grants a point and service to the opponent
            if (newSanction.type === 'P') {
                const opponent = newSanction.team === 'A' ? 'B' : 'A';
                const st = next.sets[currentSetIdx];
                const oppTeam = opponent === 'A' ? st.teamA : st.teamB;
                oppTeam.points = (oppTeam.points || 0) + 1;
                if (!oppTeam.slashedPoints) oppTeam.slashedPoints = [];
                oppTeam.slashedPoints.push(oppTeam.points);
            }

            return next;
        });
    };

    // Save and Sync with Supabase matches table
    const handleSaveScoresheet = async (markFinished = false) => {
        if (!canEdit) return;
        try {
            setSaving(true);
            setError('');

            // Prepare match score sets array for standard standings compatibility
            const setsArray = (scoresheet.sets || []).map((st, idx) => {
                const ptsA = st.teamA?.points || 0;
                const ptsB = st.teamB?.points || 0;
                const target = idx === 4 ? 15 : 25;
                let winner = null;
                if (ptsA >= target && ptsA - ptsB >= 2) winner = 'teamA';
                else if (ptsB >= target && ptsB - ptsA >= 2) winner = 'teamB';
                return {
                    setNumber: idx + 1,
                    a: ptsA,
                    b: ptsB,
                    winner
                };
            }).filter(s => s.a > 0 || s.b > 0);

            const isMatchDecided = setsWon.a === 3 || setsWon.b === 3 || markFinished;
            const matchWinnerId = setsWon.a >= 3 ? teamAId : (setsWon.b >= 3 ? teamBId : null);

            const updatedScore = {
                ...(match.score || {}),
                sets: setsArray,
                setsA: setsWon.a,
                setsB: setsWon.b,
                winnerId: matchWinnerId,
                officialScoresheet: scoresheet
            };

            await updateData(id, {
                score: updatedScore,
                status: isMatchDecided ? 'finished' : (setsArray.length > 0 ? 'live' : 'scheduled')
            });

            setSaveMessage(isMatchDecided ? '¡Partido finalizado y planilla oficial guardada!' : 'Planilla oficial sincronizada con éxito.');
            setTimeout(() => setSaveMessage(''), 3000);
        } catch (err) {
            console.error('Error guardando planilla oficial:', err);
            setError('Error al sincronizar la planilla oficial.');
        } finally {
            setSaving(false);
        }
    };

    if (!match || !teamA || !teamB || !scoresheet) {
        return (
            <div className="p-12 text-center text-slate-500 space-y-4">
                <p>Cargando mesa de control y planilla oficial FIVB...</p>
                <Link to="/matches" className="btn btn-primary inline-flex items-center space-x-2">
                    <ArrowLeft size={16} />
                    <span>Volver a Partidos</span>
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-16">
            {/* Header & Experimental Notice */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 shadow-xl border border-indigo-900/50">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <div className="flex items-center space-x-3 mb-2">
                            <button
                                onClick={() => navigate('/matches')}
                                className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition text-white"
                                title="Volver al calendario"
                            >
                                <ArrowLeft size={18} />
                            </button>
                            <span className="bg-amber-400 text-slate-950 text-xs font-black uppercase px-3 py-1 rounded-full tracking-wider flex items-center space-x-1.5 shadow-sm">
                                <Shield size={13} className="text-slate-950" />
                                <span>Experimental: Liga B y Femenina</span>
                            </span>
                            {isDelegate && (
                                <span className="bg-teal-500/20 text-teal-300 border border-teal-400/30 text-xs font-semibold px-3 py-1 rounded-full flex items-center space-x-1">
                                    <Eye size={13} />
                                    <span>Modo Observador Oficial</span>
                                </span>
                            )}
                        </div>
                        <h1 className="text-2xl md:text-3xl font-black text-white flex items-center space-x-3">
                            <span>Mesa Técnica Oficial FIVB</span>
                        </h1>
                        <p className="text-slate-400 text-xs md:text-sm mt-1">
                            Anotación oficial con rotación I-VI, control de saques, sustituciones, tiempos fuera y sanciones.
                        </p>
                    </div>

                    {/* Actions & Export */}
                    <div className="flex items-center flex-wrap gap-2 w-full md:w-auto">
                        <button
                            onClick={() => exportFIVBScoresheetPDF(match, scoresheet, teamA, teamB)}
                            className="btn bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs flex items-center space-x-1.5 py-2 px-3 rounded-xl transition"
                        >
                            <Download size={15} />
                            <span>Exportar PDF FIVB</span>
                        </button>

                        {canEdit && (
                            <>
                                <button
                                    onClick={() => handleSaveScoresheet(false)}
                                    disabled={saving}
                                    className="btn btn-secondary text-xs flex items-center space-x-1.5 py-2 px-3.5 rounded-xl shadow-md font-bold"
                                >
                                    <Save size={15} />
                                    <span>{saving ? 'Guardando...' : 'Sincronizar'}</span>
                                </button>
                                <button
                                    onClick={() => {
                                        if (window.confirm('¿Deseas cerrar y finalizar este partido oficialmente?')) {
                                            handleSaveScoresheet(true);
                                        }
                                    }}
                                    disabled={saving || (setsWon.a < 3 && setsWon.b < 3)}
                                    className={`btn text-xs flex items-center space-x-1.5 py-2 px-3.5 rounded-xl font-bold ${
                                        setsWon.a >= 3 || setsWon.b >= 3
                                            ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/30'
                                            : 'bg-slate-700 text-slate-400 cursor-not-allowed'
                                    }`}
                                >
                                    <CheckCircle size={15} />
                                    <span>Finalizar Partido</span>
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* Scoreboard Bar */}
                <div className="mt-6 pt-6 border-t border-white/10 grid grid-cols-3 items-center text-center">
                    {/* Team A */}
                    <div className="flex flex-col items-center">
                        <div className="w-12 h-12 rounded-full bg-white/10 border border-white/20 flex items-center justify-center overflow-hidden mb-1">
                            {teamA.logo_url || teamA.logoUrl ? (
                                <img src={teamA.logo_url || teamA.logoUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <span className="font-black text-amber-400 text-lg">A</span>
                            )}
                        </div>
                        <h2 className="text-base md:text-lg font-bold text-white">{teamA.name}</h2>
                        <span className="text-[11px] text-indigo-300 font-mono">Equipo A</span>
                    </div>

                    {/* Sets Count */}
                    <div className="flex flex-col items-center">
                        <div className="flex items-center space-x-4 bg-black/40 px-6 py-2 rounded-2xl border border-white/10">
                            <span className="text-4xl md:text-5xl font-black text-amber-400">{setsWon.a}</span>
                            <span className="text-xs text-slate-400 font-bold tracking-widest uppercase">SETS</span>
                            <span className="text-4xl md:text-5xl font-black text-amber-400">{setsWon.b}</span>
                        </div>
                        <span className="text-xs text-slate-400 mt-2 font-mono">
                            Mejor de 5 Sets • Set en curso: #{currentSetIdx + 1}
                        </span>
                    </div>

                    {/* Team B */}
                    <div className="flex flex-col items-center">
                        <div className="w-12 h-12 rounded-full bg-white/10 border border-white/20 flex items-center justify-center overflow-hidden mb-1">
                            {teamB.logo_url || teamB.logoUrl ? (
                                <img src={teamB.logo_url || teamB.logoUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <span className="font-black text-indigo-400 text-lg">B</span>
                            )}
                        </div>
                        <h2 className="text-base md:text-lg font-bold text-white">{teamB.name}</h2>
                        <span className="text-[11px] text-indigo-300 font-mono">Equipo B</span>
                    </div>
                </div>

                {saveMessage && (
                    <div className="mt-4 p-3 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs rounded-xl flex items-center space-x-2 font-bold animate-fadeIn">
                        <CheckCircle size={16} />
                        <span>{saveMessage}</span>
                    </div>
                )}
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center space-x-2 border-b border-slate-200 pb-3 overflow-x-auto">
                <button
                    onClick={() => setActiveTab('live')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shrink-0 ${
                        activeTab === 'live'
                            ? 'bg-primary text-white shadow-sm'
                            : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                    }`}
                >
                    <Play size={14} />
                    <span>Mesa en Vivo (Control de Set)</span>
                </button>

                <button
                    onClick={() => setActiveTab('sheet')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shrink-0 ${
                        activeTab === 'sheet'
                            ? 'bg-primary text-white shadow-sm'
                            : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                    }`}
                >
                    <ClipboardList size={14} />
                    <span>Hoja Oficial FIVB Completa</span>
                </button>

                <button
                    onClick={() => setActiveTab('roster')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shrink-0 ${
                        activeTab === 'roster'
                            ? 'bg-primary text-white shadow-sm'
                            : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                    }`}
                >
                    <Users size={14} />
                    <span>Alineaciones y Oficiales</span>
                </button>

                <button
                    onClick={() => setActiveTab('sanctions')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shrink-0 ${
                        activeTab === 'sanctions'
                            ? 'bg-primary text-white shadow-sm'
                            : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                    }`}
                >
                    <AlertTriangle size={14} />
                    <span>Sanciones y Observaciones ({scoresheet.sanctions?.length || 0})</span>
                </button>
            </div>

            {/* TAB 1: Mesa en Vivo (Control de Set) */}
            {activeTab === 'live' && (
                <div className="space-y-6">
                    {/* Selector de Sets 1 a 5 */}
                    <div className="flex items-center space-x-2">
                        {[1, 2, 3, 4, 5].map((sNum, idx) => {
                            const setPtsA = scoresheet.sets[idx]?.teamA?.points || 0;
                            const setPtsB = scoresheet.sets[idx]?.teamB?.points || 0;
                            const isCurrent = currentSetIdx === idx;
                            return (
                                <button
                                    key={sNum}
                                    onClick={() => setCurrentSetIdx(idx)}
                                    className={`flex-1 py-3 px-2 rounded-2xl border text-center transition ${
                                        isCurrent
                                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-md ring-2 ring-indigo-200'
                                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                                    }`}
                                >
                                    <div className="text-xs font-bold">SET {sNum} {sNum === 5 && '(Decisivo)'}</div>
                                    <div className={`text-base font-black ${isCurrent ? 'text-amber-300' : 'text-slate-900'}`}>
                                        {setPtsA} - {setPtsB}
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    {/* Set Controls & Court Visualization */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Team A Live Panel */}
                        <div className="card border-2 border-indigo-100 p-5 space-y-4">
                            <div className="flex justify-between items-center border-b pb-3">
                                <div>
                                    <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Equipo A</span>
                                    <h3 className="text-xl font-black text-slate-900">{teamA.name}</h3>
                                </div>
                                <div className="text-right">
                                    <span className="text-4xl font-black text-primary">{currentSet.teamA.points || 0}</span>
                                    <span className="text-xs text-slate-400 block font-mono">pts</span>
                                </div>
                            </div>

                            {/* Scoring Buttons */}
                            {canEdit && (
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => handleAddPoint('A')}
                                        className="btn bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-3 rounded-xl flex items-center justify-center space-x-2 shadow-md active:scale-95 transition"
                                    >
                                        <Plus size={18} />
                                        <span>Punto para {teamA.name}</span>
                                    </button>
                                    <button
                                        onClick={() => handleSubtractPoint('A')}
                                        className="btn border border-slate-200 hover:bg-slate-100 text-slate-700 py-3 rounded-xl flex items-center justify-center space-x-1.5 text-xs font-bold"
                                    >
                                        <Minus size={15} />
                                        <span>Corregir (-1)</span>
                                    </button>
                                </div>
                            )}

                            {/* Positions I-VI Rotations */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                                    <span>Rotación en Cancha (Posiciones Oficiales I - VI)</span>
                                    <span className="text-[11px] text-slate-400">N° de Jugador</span>
                                </label>
                                <div className="grid grid-cols-6 gap-1.5 text-center">
                                    {['I', 'II', 'III', 'IV', 'V', 'VI'].map((pos, pIdx) => (
                                        <div key={pos} className="bg-slate-50 border border-slate-200 rounded-xl p-2">
                                            <span className="text-[10px] font-mono text-slate-400 block font-bold">{pos}</span>
                                            <input
                                                type="text"
                                                maxLength={3}
                                                disabled={!canEdit}
                                                value={currentSet.teamA.starters[pIdx] || ''}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    setScoresheet(prev => {
                                                        const next = JSON.parse(JSON.stringify(prev));
                                                        next.sets[currentSetIdx].teamA.starters[pIdx] = val;
                                                        return next;
                                                    });
                                                }}
                                                className="w-full text-center font-black text-slate-800 text-sm bg-transparent outline-none focus:text-indigo-600"
                                                placeholder="N°"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Time-outs & Substitutions Stats */}
                            <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-xs font-bold text-amber-900">Tiempos Fuera (T)</span>
                                        {canEdit && (
                                            <button
                                                onClick={() => handleRecordTimeout('A')}
                                                className="text-[11px] bg-amber-600 text-white px-2 py-0.5 rounded font-bold hover:bg-amber-700"
                                            >
                                                + Pedir
                                            </button>
                                        )}
                                    </div>
                                    <div className="text-xs text-amber-800 font-mono space-y-0.5">
                                        <div>T1: {currentSet.teamA.timeouts[0] || 'Disponible'}</div>
                                        <div>T2: {currentSet.teamA.timeouts[1] || 'Disponible'}</div>
                                    </div>
                                </div>

                                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                                    <span className="text-xs font-bold text-slate-700 block mb-1">Sustituciones</span>
                                    <div className="text-xs text-slate-600">
                                        {currentSet.teamA.substitutes.filter(Boolean).length} / 6 realizadas
                                    </div>
                                </div>
                            </div>

                            {/* Slashed Points Column (FIVB Visualizer) */}
                            <div className="space-y-1.5 pt-2">
                                <span className="text-[11px] font-bold text-slate-500 uppercase">Columna Oficial de Puntos (1-{isFifthSet ? 30 : 48})</span>
                                <div className="grid grid-cols-12 gap-1 max-h-28 overflow-y-auto p-1 bg-slate-50 rounded-xl border">
                                    {Array.from({ length: isFifthSet ? 30 : 48 }, (_, i) => i + 1).map(pt => {
                                        const isSlashed = (currentSet.teamA.slashedPoints || []).includes(pt);
                                        return (
                                            <div
                                                key={pt}
                                                className={`text-[10px] font-mono font-bold text-center py-0.5 rounded ${
                                                    isSlashed
                                                        ? 'bg-indigo-600 text-white line-through decoration-white'
                                                        : 'text-slate-400 bg-white'
                                                }`}
                                            >
                                                {pt}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Team B Live Panel */}
                        <div className="card border-2 border-indigo-100 p-5 space-y-4">
                            <div className="flex justify-between items-center border-b pb-3">
                                <div>
                                    <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Equipo B</span>
                                    <h3 className="text-xl font-black text-slate-900">{teamB.name}</h3>
                                </div>
                                <div className="text-right">
                                    <span className="text-4xl font-black text-primary">{currentSet.teamB.points || 0}</span>
                                    <span className="text-xs text-slate-400 block font-mono">pts</span>
                                </div>
                            </div>

                            {/* Scoring Buttons */}
                            {canEdit && (
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => handleAddPoint('B')}
                                        className="btn bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-3 rounded-xl flex items-center justify-center space-x-2 shadow-md active:scale-95 transition"
                                    >
                                        <Plus size={18} />
                                        <span>Punto para {teamB.name}</span>
                                    </button>
                                    <button
                                        onClick={() => handleSubtractPoint('B')}
                                        className="btn border border-slate-200 hover:bg-slate-100 text-slate-700 py-3 rounded-xl flex items-center justify-center space-x-1.5 text-xs font-bold"
                                    >
                                        <Minus size={15} />
                                        <span>Corregir (-1)</span>
                                    </button>
                                </div>
                            )}

                            {/* Positions I-VI Rotations */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                                    <span>Rotación en Cancha (Posiciones Oficiales I - VI)</span>
                                    <span className="text-[11px] text-slate-400">N° de Jugador</span>
                                </label>
                                <div className="grid grid-cols-6 gap-1.5 text-center">
                                    {['I', 'II', 'III', 'IV', 'V', 'VI'].map((pos, pIdx) => (
                                        <div key={pos} className="bg-slate-50 border border-slate-200 rounded-xl p-2">
                                            <span className="text-[10px] font-mono text-slate-400 block font-bold">{pos}</span>
                                            <input
                                                type="text"
                                                maxLength={3}
                                                disabled={!canEdit}
                                                value={currentSet.teamB.starters[pIdx] || ''}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    setScoresheet(prev => {
                                                        const next = JSON.parse(JSON.stringify(prev));
                                                        next.sets[currentSetIdx].teamB.starters[pIdx] = val;
                                                        return next;
                                                    });
                                                }}
                                                className="w-full text-center font-black text-slate-800 text-sm bg-transparent outline-none focus:text-indigo-600"
                                                placeholder="N°"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Time-outs & Substitutions Stats */}
                            <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-xs font-bold text-amber-900">Tiempos Fuera (T)</span>
                                        {canEdit && (
                                            <button
                                                onClick={() => handleRecordTimeout('B')}
                                                className="text-[11px] bg-amber-600 text-white px-2 py-0.5 rounded font-bold hover:bg-amber-700"
                                            >
                                                + Pedir
                                            </button>
                                        )}
                                    </div>
                                    <div className="text-xs text-amber-800 font-mono space-y-0.5">
                                        <div>T1: {currentSet.teamB.timeouts[0] || 'Disponible'}</div>
                                        <div>T2: {currentSet.teamB.timeouts[1] || 'Disponible'}</div>
                                    </div>
                                </div>

                                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                                    <span className="text-xs font-bold text-slate-700 block mb-1">Sustituciones</span>
                                    <div className="text-xs text-slate-600">
                                        {currentSet.teamB.substitutes.filter(Boolean).length} / 6 realizadas
                                    </div>
                                </div>
                            </div>

                            {/* Slashed Points Column (FIVB Visualizer) */}
                            <div className="space-y-1.5 pt-2">
                                <span className="text-[11px] font-bold text-slate-500 uppercase">Columna Oficial de Puntos (1-{isFifthSet ? 30 : 48})</span>
                                <div className="grid grid-cols-12 gap-1 max-h-28 overflow-y-auto p-1 bg-slate-50 rounded-xl border">
                                    {Array.from({ length: isFifthSet ? 30 : 48 }, (_, i) => i + 1).map(pt => {
                                        const isSlashed = (currentSet.teamB.slashedPoints || []).includes(pt);
                                        return (
                                            <div
                                                key={pt}
                                                className={`text-[10px] font-mono font-bold text-center py-0.5 rounded ${
                                                    isSlashed
                                                        ? 'bg-indigo-600 text-white line-through decoration-white'
                                                        : 'text-slate-400 bg-white'
                                                }`}
                                            >
                                                {pt}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Deciding 5th Set Court Change Banner */}
                    {isFifthSet && (
                        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between text-amber-900 text-xs">
                            <div className="flex items-center space-x-2">
                                <RotateCw className="text-amber-600" size={18} />
                                <div>
                                    <strong className="block font-bold">Regla FIVB 3.5 - Cambio de Cancha en Set Decisivo (Punto 8)</strong>
                                    <span>
                                        {currentSet.fifthSetChangeCourt?.swappedAt
                                            ? `Cambio de cancha registrado a las ${currentSet.fifthSetChangeCourt.swappedAt} al alcanzar los 8 puntos.`
                                            : 'Al alcanzar 8 puntos cualquiera de los dos equipos, se efectúa cambio de campo de juego.'}
                                    </span>
                                </div>
                            </div>
                            {currentSet.fifthSetChangeCourt?.swappedAt && (
                                <span className="bg-amber-200 text-amber-900 px-2.5 py-1 rounded-lg font-bold">
                                    Efectuado en 8 pts
                                </span>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* TAB 2: Hoja Oficial FIVB Completa (Full Facsimile Grid) */}
            {activeTab === 'sheet' && (
                <div className="card p-6 border border-slate-200 space-y-6 overflow-x-auto">
                    <div className="border-b pb-4 text-center">
                        <span className="text-xs uppercase tracking-widest font-black text-indigo-700">Fédération Internationale de Volleyball</span>
                        <h2 className="text-2xl font-black text-slate-900">INTERNATIONAL SCORESHEET - PLANILLA OFICIAL FIVB</h2>
                        <p className="text-xs text-slate-500">Mesa de Resultados Oficial - Liga de Voleibol de Comayagua</p>
                    </div>

                    {/* Resumen de Sets 1 a 5 (Results Table Fig. 7) */}
                    <div>
                        <h4 className="text-sm font-bold text-slate-800 mb-2 uppercase">Cuadro de Resultados Oficial (RESULTS)</h4>
                        <div className="overflow-x-auto border border-slate-300 rounded-xl">
                            <table className="w-full text-center text-xs border-collapse">
                                <thead className="bg-slate-900 text-white font-bold">
                                    <tr>
                                        <th colSpan={4} className="py-2 border-r border-slate-700">{teamA.name} [A]</th>
                                        <th className="py-2 px-4 border-r border-slate-700">SET</th>
                                        <th colSpan={4} className="py-2">{teamB.name} [B]</th>
                                    </tr>
                                    <tr className="bg-slate-800 text-[11px] text-slate-300 border-t border-slate-700">
                                        <th className="py-1 px-2 border-r border-slate-700">T</th>
                                        <th className="py-1 px-2 border-r border-slate-700">S</th>
                                        <th className="py-1 px-2 border-r border-slate-700">W</th>
                                        <th className="py-1 px-2 border-r border-slate-700">Puntos</th>
                                        <th className="py-1 px-2 border-r border-slate-700">Duración</th>
                                        <th className="py-1 px-2 border-r border-slate-700">Puntos</th>
                                        <th className="py-1 px-2 border-r border-slate-700">W</th>
                                        <th className="py-1 px-2 border-r border-slate-700">S</th>
                                        <th className="py-1 px-2">T</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                    {[0, 1, 2, 3, 4].map(sIdx => {
                                        const st = scoresheet.sets[sIdx];
                                        const ptsA = st?.teamA?.points || 0;
                                        const ptsB = st?.teamB?.points || 0;
                                        const target = sIdx === 4 ? 15 : 25;
                                        const wonA = ptsA >= target && ptsA - ptsB >= 2 ? 1 : 0;
                                        const wonB = ptsB >= target && ptsB - ptsA >= 2 ? 1 : 0;
                                        const toA = (st?.teamA?.timeouts || []).filter(Boolean).length;
                                        const toB = (st?.teamB?.timeouts || []).filter(Boolean).length;
                                        const subsA = (st?.teamA?.substitutes || []).filter(Boolean).length;
                                        const subsB = (st?.teamB?.substitutes || []).filter(Boolean).length;

                                        return (
                                            <tr key={sIdx} className="hover:bg-slate-50 font-mono">
                                                <td className="py-2 border-r border-slate-200">{toA}</td>
                                                <td className="py-2 border-r border-slate-200">{subsA}</td>
                                                <td className="py-2 border-r border-slate-200 font-bold">{wonA}</td>
                                                <td className="py-2 border-r border-slate-200 font-black text-indigo-700">{ptsA}</td>
                                                <td className="py-2 border-r border-slate-200 font-sans font-bold bg-slate-50">Set {sIdx + 1}</td>
                                                <td className="py-2 border-r border-slate-200 font-black text-indigo-700">{ptsB}</td>
                                                <td className="py-2 border-r border-slate-200 font-bold">{wonB}</td>
                                                <td className="py-2 border-r border-slate-200">{subsB}</td>
                                                <td className="py-2">{toB}</td>
                                            </tr>
                                        );
                                    })}
                                    <tr className="bg-slate-100 font-black text-slate-900 border-t-2 border-slate-300">
                                        <td className="py-2 border-r border-slate-200">-</td>
                                        <td className="py-2 border-r border-slate-200">-</td>
                                        <td className="py-2 border-r border-slate-200 text-sm">{setsWon.a}</td>
                                        <td className="py-2 border-r border-slate-200 text-sm">
                                            {scoresheet.sets.reduce((acc, s) => acc + (s.teamA?.points || 0), 0)}
                                        </td>
                                        <td className="py-2 border-r border-slate-200 uppercase font-sans">TOTAL</td>
                                        <td className="py-2 border-r border-slate-200 text-sm">
                                            {scoresheet.sets.reduce((acc, s) => acc + (s.teamB?.points || 0), 0)}
                                        </td>
                                        <td className="py-2 border-r border-slate-200 text-sm">{setsWon.b}</td>
                                        <td className="py-2 border-r border-slate-200">-</td>
                                        <td className="py-2">-</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Sets Rotations Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {scoresheet.sets.map((st, idx) => (
                            <div key={idx} className="border border-slate-200 rounded-xl p-3 bg-slate-50">
                                <div className="flex justify-between items-center mb-2 font-bold text-xs text-slate-700 border-b pb-1">
                                    <span>SET {idx + 1}</span>
                                    <span>Marcador: {st.teamA.points || 0} - {st.teamB.points || 0}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div>
                                        <span className="font-bold text-indigo-700">{teamA.name}</span>
                                        <div className="text-[11px] text-slate-600 font-mono">
                                            Pos: {st.teamA.starters.filter(Boolean).join(', ') || 'Sin definir'}
                                        </div>
                                    </div>
                                    <div>
                                        <span className="font-bold text-indigo-700">{teamB.name}</span>
                                        <div className="text-[11px] text-slate-600 font-mono">
                                            Pos: {st.teamB.starters.filter(Boolean).join(', ') || 'Sin definir'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* TAB 3: Alineaciones y Oficiales */}
            {activeTab === 'roster' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Team A Roster Configuration */}
                    <div className="card p-5 space-y-4">
                        <div className="flex justify-between items-center border-b pb-2">
                            <h3 className="font-black text-slate-900 text-base">Planilla: {teamA.name}</h3>
                            <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-bold">Equipo A</span>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">Capitán (N°)</label>
                                <input
                                    type="text"
                                    disabled={!canEdit}
                                    value={scoresheet.rosterA.captainNumber || ''}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setScoresheet(prev => {
                                            const next = JSON.parse(JSON.stringify(prev));
                                            next.rosterA.captainNumber = val;
                                            return next;
                                        });
                                    }}
                                    placeholder="Ej: 8"
                                    className="input text-xs w-full"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1">Líbero Principal (N°)</label>
                                    <input
                                        type="text"
                                        disabled={!canEdit}
                                        value={scoresheet.rosterA.liberos?.[0] || ''}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setScoresheet(prev => {
                                                const next = JSON.parse(JSON.stringify(prev));
                                                if (!next.rosterA.liberos) next.rosterA.liberos = ['', ''];
                                                next.rosterA.liberos[0] = val;
                                                return next;
                                            });
                                        }}
                                        placeholder="Ej: 14"
                                        className="input text-xs w-full"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1">Líbero Reserva (N°)</label>
                                    <input
                                        type="text"
                                        disabled={!canEdit}
                                        value={scoresheet.rosterA.liberos?.[1] || ''}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setScoresheet(prev => {
                                                const next = JSON.parse(JSON.stringify(prev));
                                                if (!next.rosterA.liberos) next.rosterA.liberos = ['', ''];
                                                next.rosterA.liberos[1] = val;
                                                return next;
                                            });
                                        }}
                                        placeholder="Ej: 2"
                                        className="input text-xs w-full"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">Entrenador (Coach C)</label>
                                <input
                                    type="text"
                                    disabled={!canEdit}
                                    value={scoresheet.rosterA.coach || ''}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setScoresheet(prev => {
                                            const next = JSON.parse(JSON.stringify(prev));
                                            next.rosterA.coach = val;
                                            return next;
                                        });
                                    }}
                                    placeholder="Nombre del DT"
                                    className="input text-xs w-full"
                                />
                            </div>

                            {/* Registered Players List */}
                            <div className="pt-2">
                                <label className="block text-xs font-bold text-slate-700 mb-1">Jugadores Registrados ({playersA.length})</label>
                                <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 border rounded-xl p-2 bg-slate-50">
                                    {playersA.length > 0 ? (
                                        playersA.map(p => (
                                            <div key={p.id} className="py-1 text-xs flex justify-between items-center">
                                                <span className="font-mono font-bold text-indigo-700">#{p.number || '-'}</span>
                                                <span className="text-slate-800">{p.name}</span>
                                                <span className="text-[10px] text-slate-400">{p.position || 'Jugador'}</span>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-xs text-slate-400 text-center py-2">No hay jugadores registrados en este equipo.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Team B Roster Configuration */}
                    <div className="card p-5 space-y-4">
                        <div className="flex justify-between items-center border-b pb-2">
                            <h3 className="font-black text-slate-900 text-base">Planilla: {teamB.name}</h3>
                            <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-bold">Equipo B</span>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">Capitán (N°)</label>
                                <input
                                    type="text"
                                    disabled={!canEdit}
                                    value={scoresheet.rosterB.captainNumber || ''}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setScoresheet(prev => {
                                            const next = JSON.parse(JSON.stringify(prev));
                                            next.rosterB.captainNumber = val;
                                            return next;
                                        });
                                    }}
                                    placeholder="Ej: 3"
                                    className="input text-xs w-full"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1">Líbero Principal (N°)</label>
                                    <input
                                        type="text"
                                        disabled={!canEdit}
                                        value={scoresheet.rosterB.liberos?.[0] || ''}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setScoresheet(prev => {
                                                const next = JSON.parse(JSON.stringify(prev));
                                                if (!next.rosterB.liberos) next.rosterB.liberos = ['', ''];
                                                next.rosterB.liberos[0] = val;
                                                return next;
                                            });
                                        }}
                                        placeholder="Ej: 11"
                                        className="input text-xs w-full"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1">Líbero Reserva (N°)</label>
                                    <input
                                        type="text"
                                        disabled={!canEdit}
                                        value={scoresheet.rosterB.liberos?.[1] || ''}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setScoresheet(prev => {
                                                const next = JSON.parse(JSON.stringify(prev));
                                                if (!next.rosterB.liberos) next.rosterB.liberos = ['', ''];
                                                next.rosterB.liberos[1] = val;
                                                return next;
                                            });
                                        }}
                                        placeholder="Ej: 15"
                                        className="input text-xs w-full"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">Entrenador (Coach C)</label>
                                <input
                                    type="text"
                                    disabled={!canEdit}
                                    value={scoresheet.rosterB.coach || ''}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setScoresheet(prev => {
                                            const next = JSON.parse(JSON.stringify(prev));
                                            next.rosterB.coach = val;
                                            return next;
                                        });
                                    }}
                                    placeholder="Nombre del DT"
                                    className="input text-xs w-full"
                                />
                            </div>

                            {/* Registered Players List */}
                            <div className="pt-2">
                                <label className="block text-xs font-bold text-slate-700 mb-1">Jugadores Registrados ({playersB.length})</label>
                                <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 border rounded-xl p-2 bg-slate-50">
                                    {playersB.length > 0 ? (
                                        playersB.map(p => (
                                            <div key={p.id} className="py-1 text-xs flex justify-between items-center">
                                                <span className="font-mono font-bold text-indigo-700">#{p.number || '-'}</span>
                                                <span className="text-slate-800">{p.name}</span>
                                                <span className="text-[10px] text-slate-400">{p.position || 'Jugador'}</span>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-xs text-slate-400 text-center py-2">No hay jugadores registrados en este equipo.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Official Referees & Scorers (Full Width) */}
                    <div className="card p-5 col-span-1 md:col-span-2 space-y-4">
                        <h3 className="font-black text-slate-900 text-base border-b pb-2">Cuerpo Arbitral y Mesa (APPROVAL - Fig. 2)</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">1er Árbitro</label>
                                <input
                                    type="text"
                                    disabled={!canEdit}
                                    value={scoresheet.officials?.referee1?.name || ''}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setScoresheet(prev => {
                                            const next = JSON.parse(JSON.stringify(prev));
                                            if (!next.officials.referee1) next.officials.referee1 = { name: '', country: 'HON' };
                                            next.officials.referee1.name = val;
                                            return next;
                                        });
                                    }}
                                    placeholder="Nombre"
                                    className="input text-xs w-full"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">2do Árbitro</label>
                                <input
                                    type="text"
                                    disabled={!canEdit}
                                    value={scoresheet.officials?.referee2?.name || ''}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setScoresheet(prev => {
                                            const next = JSON.parse(JSON.stringify(prev));
                                            if (!next.officials.referee2) next.officials.referee2 = { name: '', country: 'HON' };
                                            next.officials.referee2.name = val;
                                            return next;
                                        });
                                    }}
                                    placeholder="Nombre"
                                    className="input text-xs w-full"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">Anotador Oficial</label>
                                <input
                                    type="text"
                                    disabled={!canEdit}
                                    value={scoresheet.officials?.scorer?.name || ''}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setScoresheet(prev => {
                                            const next = JSON.parse(JSON.stringify(prev));
                                            if (!next.officials.scorer) next.officials.scorer = { name: '', country: 'HON' };
                                            next.officials.scorer.name = val;
                                            return next;
                                        });
                                    }}
                                    placeholder="Nombre"
                                    className="input text-xs w-full"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">Asistente de Anotador</label>
                                <input
                                    type="text"
                                    disabled={!canEdit}
                                    value={scoresheet.officials?.assistantScorer?.name || ''}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setScoresheet(prev => {
                                            const next = JSON.parse(JSON.stringify(prev));
                                            if (!next.officials.assistantScorer) next.officials.assistantScorer = { name: '', country: 'HON' };
                                            next.officials.assistantScorer.name = val;
                                            return next;
                                        });
                                    }}
                                    placeholder="Nombre"
                                    className="input text-xs w-full"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 4: Sanciones y Observaciones */}
            {activeTab === 'sanctions' && (
                <div className="card p-6 space-y-6">
                    <div className="flex justify-between items-center border-b pb-3">
                        <div>
                            <h3 className="font-black text-slate-900 text-lg">Cuadro Oficial de Sanciones (SANCTIONS - Fig. 6)</h3>
                            <p className="text-xs text-slate-500">
                                W (Advertencia), P (Penalización con punto al rival), E (Expulsión), D (Descalificación).
                            </p>
                        </div>
                    </div>

                    {/* New Sanction Form */}
                    {canEdit && (
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                            <span className="text-xs font-bold text-slate-700 block">Registrar Nueva Sanción</span>
                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                                <div>
                                    <label className="text-[11px] font-bold text-slate-500">Tipo Sanción</label>
                                    <select id="sanction-type" className="input text-xs w-full">
                                        <option value="W">W - Warning (Advertencia)</option>
                                        <option value="P">P - Penalty (Punto rival)</option>
                                        <option value="E">E - Expulsion (Set)</option>
                                        <option value="D">D - Disqualification</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[11px] font-bold text-slate-500">Equipo</label>
                                    <select id="sanction-team" className="input text-xs w-full">
                                        <option value="A">Equipo A ({teamA.name})</option>
                                        <option value="B">Equipo B ({teamB.name})</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[11px] font-bold text-slate-500">N° Jugador / DT</label>
                                    <input id="sanction-target" type="text" placeholder="Ej: 13 o C" className="input text-xs w-full" />
                                </div>
                                <div>
                                    <label className="text-[11px] font-bold text-slate-500">Set</label>
                                    <input id="sanction-set" type="number" defaultValue={currentSetIdx + 1} min={1} max={5} className="input text-xs w-full" />
                                </div>
                                <div className="flex items-end">
                                    <button
                                        onClick={() => {
                                            const type = document.getElementById('sanction-type').value;
                                            const team = document.getElementById('sanction-team').value;
                                            const target = document.getElementById('sanction-target').value;
                                            const setNum = parseInt(document.getElementById('sanction-set').value, 10) || (currentSetIdx + 1);

                                            if (!target) {
                                                alert('Ingresa el número de jugador o función (C, AC).');
                                                return;
                                            }

                                            const ptsA = currentSet.teamA.points || 0;
                                            const ptsB = currentSet.teamB.points || 0;
                                            const score = `${ptsA}:${ptsB}`;

                                            handleAddSanction({
                                                type,
                                                team,
                                                playerOrOfficial: target,
                                                set: setNum,
                                                score
                                            });

                                            document.getElementById('sanction-target').value = '';
                                        }}
                                        className="btn btn-primary text-xs w-full py-2.5 font-bold"
                                    >
                                        + Agregar
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Sanciones Registradas Table */}
                    <div className="overflow-x-auto border border-slate-200 rounded-xl">
                        <table className="w-full text-center text-xs">
                            <thead className="bg-slate-100 font-bold text-slate-700">
                                <tr>
                                    <th className="py-2 px-3">Tipo</th>
                                    <th className="py-2 px-3">Equipo</th>
                                    <th className="py-2 px-3">Sancionado</th>
                                    <th className="py-2 px-3">Set</th>
                                    <th className="py-2 px-3">Marcador al Momento</th>
                                    {canEdit && <th className="py-2 px-3">Acción</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {scoresheet.sanctions && scoresheet.sanctions.length > 0 ? (
                                    scoresheet.sanctions.map((sc, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50">
                                            <td className="py-2 font-black text-red-600">{sc.type}</td>
                                            <td className="py-2 font-bold">{sc.team === 'A' ? teamA.name : teamB.name}</td>
                                            <td className="py-2 font-mono">N° {sc.playerOrOfficial}</td>
                                            <td className="py-2">Set {sc.set}</td>
                                            <td className="py-2 font-mono font-bold">{sc.score || '-'}</td>
                                            {canEdit && (
                                                <td className="py-2">
                                                    <button
                                                        onClick={() => {
                                                            setScoresheet(prev => {
                                                                const next = JSON.parse(JSON.stringify(prev));
                                                                next.sanctions.splice(idx, 1);
                                                                return next;
                                                            });
                                                        }}
                                                        className="text-red-500 hover:text-red-700 font-bold text-[11px]"
                                                    >
                                                        Eliminar
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={canEdit ? 6 : 5} className="py-6 text-slate-400 text-center">
                                            Sin sanciones registradas en este partido.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Observaciones (REMARKS) */}
                    <div className="space-y-2 pt-2">
                        <label className="block text-xs font-bold text-slate-700">Observaciones y Protestas de Capitanes (REMARKS)</label>
                        <textarea
                            disabled={!canEdit}
                            rows={3}
                            value={scoresheet.remarks || ''}
                            onChange={(e) => {
                                const val = e.target.value;
                                setScoresheet(prev => {
                                    const next = JSON.parse(JSON.stringify(prev));
                                    next.remarks = val;
                                    return next;
                                });
                            }}
                            placeholder="Escribe observaciones arbitrales o protestas oficiales si las hubo..."
                            className="input w-full text-xs font-sans"
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default OfficialScoresheet;
