import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useSupabase } from '../hooks/useSupabase';
import { Trophy, ArrowLeft, Save, CheckCircle, AlertCircle, Calendar, Clock, MapPin, Award, Undo2 } from 'lucide-react';

const MatchScorer = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { data: matches, updateData } = useSupabase('matches');
    const { data: teams } = useSupabase('teams');

    const match = matches.find(m => m.id === id);
    const teamAId = match?.team_a_id || match?.teamAId;
    const teamBId = match?.team_b_id || match?.teamBId;

    const teamA = teams.find(t => t.id === teamAId);
    const teamB = teams.find(t => t.id === teamBId);

    // Estado para los 5 sets posibles (al mejor de 5)
    const [setsData, setSetsData] = useState([
        { setNumber: 1, a: '', b: '' },
        { setNumber: 2, a: '', b: '' },
        { setNumber: 3, a: '', b: '' },
        { setNumber: 4, a: '', b: '' },
        { setNumber: 5, a: '', b: '' }
    ]);

    const [saving, setSaving] = useState(false);
    const [savedMessage, setSavedMessage] = useState('');
    const [error, setError] = useState('');

    // Cargar datos previos si ya existen
    useEffect(() => {
        if (match?.score) {
            const existingSets = match.score.sets || [];
            if (Array.isArray(existingSets) && existingSets.length > 0) {
                const loaded = [1, 2, 3, 4, 5].map(setNum => {
                    const found = existingSets.find(s => s.setNumber === setNum || s.set === setNum);
                    return {
                        setNumber: setNum,
                        a: found && found.a !== undefined && found.a !== null ? String(found.a) : '',
                        b: found && found.b !== undefined && found.b !== null ? String(found.b) : ''
                    };
                });
                setSetsData(loaded);
            } else if (match.score.pointsPerSet && Array.isArray(match.score.pointsPerSet)) {
                // Compatibilidad con formato anterior si existe
                const loaded = [1, 2, 3, 4, 5].map((setNum, idx) => {
                    const found = match.score.pointsPerSet[idx];
                    return {
                        setNumber: setNum,
                        a: found && found.a !== undefined ? String(found.a) : '',
                        b: found && found.b !== undefined ? String(found.b) : ''
                    };
                });
                setSetsData(loaded);
            }
        }
    }, [match]);

    // Función para determinar el ganador de un set específico
    const evaluateSet = (setObj) => {
        const ptsA = parseInt(setObj.a, 10);
        const ptsB = parseInt(setObj.b, 10);

        if (isNaN(ptsA) || isNaN(ptsB)) {
            return { winner: null, status: 'incomplete', ptsA: isNaN(ptsA) ? 0 : ptsA, ptsB: isNaN(ptsB) ? 0 : ptsB };
        }

        const target = setObj.setNumber === 5 ? 15 : 25;
        const diff = Math.abs(ptsA - ptsB);

        // Regla oficial de voleibol: Debe alcanzar al menos target y tener diferencia de 2 puntos
        if ((ptsA >= target || ptsB >= target) && diff >= 2) {
            return {
                winner: ptsA > ptsB ? 'teamA' : 'teamB',
                status: 'official_win',
                ptsA,
                ptsB
            };
        }

        // Si se han ingresado puntos pero aún no cumplen la regla oficial completa
        if (ptsA > 0 || ptsB > 0) {
            if (ptsA > ptsB) return { winner: 'teamA', status: 'leading', ptsA, ptsB };
            if (ptsB > ptsA) return { winner: 'teamB', status: 'leading', ptsA, ptsB };
        }

        return { winner: null, status: 'incomplete', ptsA, ptsB };
    };

    // Analizar progresivamente los sets para respetar la regla de ganar 3 sets
    const analyzedSets = useMemo(() => {
        let countA = 0;
        let countB = 0;
        let matchDecided = false;
        let matchWinner = null;

        return setsData.map((setObj, index) => {
            // Si el partido ya fue definido antes de este set, este set queda deshabilitado / no necesario
            const isUnnecessary = matchDecided;
            const evalResult = isUnnecessary ? { winner: null, status: 'unnecessary', ptsA: 0, ptsB: 0 } : evaluateSet(setObj);

            if (!isUnnecessary && evalResult.winner) {
                if (evalResult.winner === 'teamA') countA += 1;
                if (evalResult.winner === 'teamB') countB += 1;

                if (countA === 3) {
                    matchDecided = true;
                    matchWinner = 'teamA';
                } else if (countB === 3) {
                    matchDecided = true;
                    matchWinner = 'teamB';
                }
            }

            return {
                ...setObj,
                evaluation: evalResult,
                isUnnecessary,
                setsScoreAtThisPoint: { a: countA, b: countB }
            };
        });
    }, [setsData]);

    // Sets ganados totales
    const totalSetsA = useMemo(() => {
        const lastValid = analyzedSets.filter(s => !s.isUnnecessary && s.evaluation.winner);
        return lastValid.filter(s => s.evaluation.winner === 'teamA').length;
    }, [analyzedSets]);

    const totalSetsB = useMemo(() => {
        const lastValid = analyzedSets.filter(s => !s.isUnnecessary && s.evaluation.winner);
        return lastValid.filter(s => s.evaluation.winner === 'teamB').length;
    }, [analyzedSets]);

    // ¿Hay ganador del partido? (Requiere llegar a 3 sets)
    const matchWinner = useMemo(() => {
        if (totalSetsA === 3) return 'teamA';
        if (totalSetsB === 3) return 'teamB';
        return null;
    }, [totalSetsA, totalSetsB]);

    // Manejar cambio de puntos en un set
    const handleScoreChange = (setNumber, teamKey, value) => {
        setError('');
        // Aceptar solo números o vacío
        const cleanVal = value.replace(/\D/g, '');
        setSetsData(prev => prev.map(s => {
            if (s.setNumber === setNumber) {
                return { ...s, [teamKey]: cleanVal };
            }
            return s;
        }));
    };

    // Guardar resultados
    const handleSave = async (forceFinished = false) => {
        setError('');
        setSaving(true);
        setSavedMessage('');

        try {
            // Filtrar solo los sets que fueron jugados y no son innecesarios
            const setsToSave = analyzedSets
                .filter(s => !s.isUnnecessary && (s.a !== '' || s.b !== ''))
                .map(s => ({
                    setNumber: s.setNumber,
                    a: parseInt(s.a, 10) || 0,
                    b: parseInt(s.b, 10) || 0,
                    winner: s.evaluation.winner
                }));

            const isCompleted = matchWinner !== null || forceFinished;

            const scorePayload = {
                setsA: totalSetsA,
                setsB: totalSetsB,
                sets: setsToSave,
                winnerId: matchWinner === 'teamA' ? teamA.id : matchWinner === 'teamB' ? teamB.id : null
            };

            await updateData(id, {
                score: scorePayload,
                status: isCompleted ? 'finished' : (setsToSave.length > 0 ? 'in_progress' : 'scheduled')
            });

            setSavedMessage(isCompleted ? '¡Partido finalizado y guardado con éxito!' : 'Progreso guardado correctamente.');
            setTimeout(() => {
                navigate('/matches');
            }, 1200);
        } catch (err) {
            console.error("Error al guardar marcador:", err);
            setError("Ocurrió un error al guardar los resultados. Inténtalo de nuevo.");
        } finally {
            setSaving(false);
        }
    };

    // Reabrir partido si estaba finalizado
    const handleReopenMatch = async () => {
        if (!window.confirm("¿Deseas reabrir este partido para modificar sus resultados? La tabla de posiciones se recalculará automáticamente.")) return;
        try {
            setSaving(true);
            await updateData(id, {
                status: 'scheduled'
            });
            setSavedMessage("El partido fue reabierto. Puedes modificar los sets y volver a finalizarlo.");
        } catch (err) {
            console.error(err);
            setError("No se pudo reabrir el partido.");
        } finally {
            setSaving(false);
        }
    };

    if (!match || !teamA || !teamB) {
        return (
            <div className="p-12 text-center text-slate-500 space-y-4">
                <p>Cargando datos del partido...</p>
                <Link to="/matches" className="btn btn-primary inline-flex items-center space-x-2">
                    <ArrowLeft size={16} />
                    <span>Volver al calendario</span>
                </Link>
            </div>
        );
    }

    const logoA = teamA.logo_url || teamA.logoUrl;
    const logoB = teamB.logo_url || teamB.logoUrl;
    const isFinished = match.status === 'finished';

    return (
        <div className="space-y-6 max-w-4xl mx-auto pb-12">
            {/* Navegación y Encabezado */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <button
                    onClick={() => navigate('/matches')}
                    className="btn border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 flex items-center space-x-2 text-sm shadow-sm"
                >
                    <ArrowLeft size={16} />
                    <span>Volver a Partidos</span>
                </button>

                <div className="flex items-center space-x-3 text-xs text-slate-500">
                    <span className="flex items-center space-x-1 bg-slate-100 px-3 py-1.5 rounded-lg font-medium">
                        <Calendar size={13} className="text-slate-400" />
                        <span>{match.date || 'Sin fecha'}</span>
                    </span>
                    <span className="flex items-center space-x-1 bg-slate-100 px-3 py-1.5 rounded-lg font-medium">
                        <Clock size={13} className="text-slate-400" />
                        <span>{match.time || '--:--'}</span>
                    </span>
                    <span className="flex items-center space-x-1 bg-slate-100 px-3 py-1.5 rounded-lg font-medium">
                        <MapPin size={13} className="text-slate-400" />
                        <span>{match.location || 'Gimnasio'}</span>
                    </span>
                </div>
            </div>

            {/* Banner de Estado del Partido */}
            {matchWinner && (
                <div className="bg-gradient-to-r from-amber-500 to-amber-600 text-white p-4 rounded-2xl shadow-lg flex items-center justify-between animate-fadeIn">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                            <Trophy size={22} className="text-white" />
                        </div>
                        <div>
                            <h3 className="font-extrabold text-lg">
                                ¡Ganador: {matchWinner === 'teamA' ? teamA.name : teamB.name}!
                            </h3>
                            <p className="text-xs text-amber-100 font-medium">
                                Ha alcanzado 3 sets ganados ({totalSetsA} - {totalSetsB}). Partido definido según el reglamento oficial de voleibol.
                            </p>
                        </div>
                    </div>
                    <span className="text-2xl font-black bg-white/20 px-3 py-1 rounded-xl">
                        {totalSetsA} - {totalSetsB}
                    </span>
                </div>
            )}

            {savedMessage && (
                <div className="bg-green-100 border border-green-300 text-green-800 p-4 rounded-2xl flex items-center space-x-2">
                    <CheckCircle size={20} className="text-green-600 shrink-0" />
                    <span className="font-semibold text-sm">{savedMessage}</span>
                </div>
            )}

            {error && (
                <div className="bg-red-100 border border-red-300 text-red-700 p-4 rounded-2xl flex items-center space-x-2">
                    <AlertCircle size={20} className="text-red-600 shrink-0" />
                    <span className="font-semibold text-sm">{error}</span>
                </div>
            )}

            {/* Marcador Principal de Sets */}
            <div className="card bg-gradient-to-b from-slate-900 to-slate-950 text-white p-6 sm:p-8 rounded-3xl shadow-xl border border-slate-800">
                <div className="flex justify-between items-center text-xs text-slate-400 uppercase tracking-widest font-semibold pb-4 border-b border-slate-800">
                    <span>{match.round || 'Jornada'}</span>
                    <span className={isFinished ? 'text-green-400 font-bold' : 'text-secondary font-bold'}>
                        {isFinished ? 'Partido Finalizado' : 'Anotación Posterior al Partido'}
                    </span>
                </div>

                <div className="grid grid-cols-3 items-center py-6 gap-4">
                    {/* Equipo A */}
                    <div className="flex flex-col items-center text-center space-y-3">
                        <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-2xl p-1 bg-white flex items-center justify-center overflow-hidden shadow-md border-2 ${matchWinner === 'teamA' ? 'border-amber-400 ring-4 ring-amber-400/30' : 'border-slate-200'}`}>
                            {logoA ? (
                                <img src={logoA} alt={teamA.name} className="w-full h-full object-cover rounded-xl" />
                            ) : (
                                <Trophy size={36} className="text-slate-400" />
                            )}
                        </div>
                        <div>
                            <h2 className="text-base sm:text-xl font-extrabold text-white line-clamp-1">{teamA.name}</h2>
                            <span className="text-xs text-slate-400 uppercase font-semibold">Local</span>
                        </div>
                    </div>

                    {/* Sets Score Center */}
                    <div className="flex flex-col items-center justify-center space-y-2">
                        <span className="text-xs uppercase font-extrabold tracking-wider text-slate-400">Sets Ganados</span>
                        <div className="flex items-center space-x-3 sm:space-x-4">
                            <span className={`text-5xl sm:text-6xl font-black ${matchWinner === 'teamA' ? 'text-amber-400' : 'text-white'}`}>
                                {totalSetsA}
                            </span>
                            <span className="text-2xl font-bold text-slate-600">:</span>
                            <span className={`text-5xl sm:text-6xl font-black ${matchWinner === 'teamB' ? 'text-amber-400' : 'text-white'}`}>
                                {totalSetsB}
                            </span>
                        </div>
                        <span className="text-[11px] text-slate-400 bg-slate-800/80 px-2.5 py-0.5 rounded-full border border-slate-700 font-mono">
                            Al mejor de 5 sets
                        </span>
                    </div>

                    {/* Equipo B */}
                    <div className="flex flex-col items-center text-center space-y-3">
                        <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-2xl p-1 bg-white flex items-center justify-center overflow-hidden shadow-md border-2 ${matchWinner === 'teamB' ? 'border-amber-400 ring-4 ring-amber-400/30' : 'border-slate-200'}`}>
                            {logoB ? (
                                <img src={logoB} alt={teamB.name} className="w-full h-full object-cover rounded-xl" />
                            ) : (
                                <Trophy size={36} className="text-slate-400" />
                            )}
                        </div>
                        <div>
                            <h2 className="text-base sm:text-xl font-extrabold text-white line-clamp-1">{teamB.name}</h2>
                            <span className="text-xs text-slate-400 uppercase font-semibold">Visitante</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Ingreso Manual de Puntos por Set */}
            <div className="card space-y-6">
                <div>
                    <h3 className="text-xl font-bold text-primary flex items-center space-x-2">
                        <Award className="text-secondary" size={22} />
                        <span>Puntaje Detallado por Set</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                        Ingresa los puntos finales obtenidos por cada equipo en cada set. El sistema determinará automáticamente los sets ganados y cuando un equipo alcance 3 sets, será declarado ganador oficial.
                    </p>
                </div>

                <div className="space-y-4">
                    {analyzedSets.map((set, index) => {
                        const target = set.setNumber === 5 ? 15 : 25;
                        const isSet5 = set.setNumber === 5;
                        const isWonByA = set.evaluation.winner === 'teamA';
                        const isWonByB = set.evaluation.winner === 'teamB';
                        const isUnnecessary = set.isUnnecessary;

                        return (
                            <div
                                key={set.setNumber}
                                className={`p-4 rounded-2xl border transition-all ${
                                    isUnnecessary
                                        ? 'bg-slate-100/60 border-slate-200 opacity-50'
                                        : (isWonByA || isWonByB)
                                        ? 'bg-white border-primary/30 shadow-sm'
                                        : 'bg-slate-50 border-slate-200'
                                }`}
                            >
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    {/* Etiqueta del Set */}
                                    <div className="min-w-[160px]">
                                        <div className="flex items-center space-x-2">
                                            <span className="font-extrabold text-slate-800 text-sm">
                                                SET {set.setNumber}
                                            </span>
                                            {isSet5 && (
                                                <span className="bg-secondary/10 text-secondary text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                                                    Tie-break
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-[11px] text-slate-400 mt-0.5">
                                            {isUnnecessary
                                                ? 'No necesario (Partido definido)'
                                                : `A ${target} puntos (+2 de diferencia)`}
                                        </p>
                                    </div>

                                    {/* Inputs de Puntos */}
                                    <div className="flex items-center justify-center space-x-4 flex-1">
                                        {/* Input Puntos Equipo A */}
                                        <div className="flex items-center space-x-2">
                                            <span className="text-xs font-bold text-slate-600 hidden md:inline max-w-[120px] truncate text-right">
                                                {teamA.name}
                                            </span>
                                            <input
                                                type="text"
                                                inputMode="numeric"
                                                disabled={isUnnecessary}
                                                value={set.a}
                                                onChange={(e) => handleScoreChange(set.setNumber, 'a', e.target.value)}
                                                placeholder="0"
                                                className={`w-16 h-12 text-center text-xl font-mono font-black rounded-xl border-2 transition-all ${
                                                    isUnnecessary
                                                        ? 'bg-slate-200 text-slate-400 border-slate-300'
                                                        : isWonByA
                                                        ? 'bg-primary/5 text-primary border-primary shadow-sm'
                                                        : 'bg-white text-slate-800 border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20'
                                                }`}
                                            />
                                        </div>

                                        <span className="text-slate-400 font-bold text-lg">-</span>

                                        {/* Input Puntos Equipo B */}
                                        <div className="flex items-center space-x-2">
                                            <input
                                                type="text"
                                                inputMode="numeric"
                                                disabled={isUnnecessary}
                                                value={set.b}
                                                onChange={(e) => handleScoreChange(set.setNumber, 'b', e.target.value)}
                                                placeholder="0"
                                                className={`w-16 h-12 text-center text-xl font-mono font-black rounded-xl border-2 transition-all ${
                                                    isUnnecessary
                                                        ? 'bg-slate-200 text-slate-400 border-slate-300'
                                                        : isWonByB
                                                        ? 'bg-secondary/5 text-secondary border-secondary shadow-sm'
                                                        : 'bg-white text-slate-800 border-slate-200 focus:border-secondary focus:ring-2 focus:ring-secondary/20'
                                                }`}
                                            />
                                            <span className="text-xs font-bold text-slate-600 hidden md:inline max-w-[120px] truncate text-left">
                                                {teamB.name}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Indicador de Ganador del Set */}
                                    <div className="sm:text-right min-w-[140px]">
                                        {isUnnecessary ? (
                                            <span className="text-xs text-slate-400 italic">No se jugó</span>
                                        ) : isWonByA ? (
                                            <span className="inline-flex items-center space-x-1 text-xs font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-lg">
                                                <span>✓ Ganó {teamA.name}</span>
                                            </span>
                                        ) : isWonByB ? (
                                            <span className="inline-flex items-center space-x-1 text-xs font-bold text-secondary bg-secondary/10 px-2.5 py-1 rounded-lg">
                                                <span>✓ Ganó {teamB.name}</span>
                                            </span>
                                        ) : (
                                            <span className="text-xs text-slate-400 font-medium">Pendiente</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Botones de Acción */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
                {isFinished && (
                    <button
                        type="button"
                        onClick={handleReopenMatch}
                        disabled={saving}
                        className="btn border border-slate-300 text-slate-600 bg-white hover:bg-slate-50 text-xs flex items-center space-x-1.5 py-3 px-4 w-full sm:w-auto"
                    >
                        <Undo2 size={16} />
                        <span>Reabrir Partido para Editar</span>
                    </button>
                )}

                <div className="flex items-center space-x-3 w-full sm:w-auto sm:ml-auto">
                    <button
                        type="button"
                        onClick={() => handleSave(false)}
                        disabled={saving}
                        className="btn border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 py-3.5 px-6 flex-1 sm:flex-initial flex items-center justify-center space-x-2 font-semibold text-sm"
                    >
                        <Save size={18} />
                        <span>{saving ? 'Guardando...' : 'Guardar Borrador'}</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => handleSave(true)}
                        disabled={saving}
                        className="btn btn-primary py-3.5 px-8 flex-1 sm:flex-initial flex items-center justify-center space-x-2 font-bold text-sm shadow-md"
                    >
                        <CheckCircle size={18} />
                        <span>{saving ? 'Finalizando...' : 'Finalizar y Guardar Partido'}</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MatchScorer;
