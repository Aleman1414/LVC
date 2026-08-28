import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSupabase } from '../hooks/useSupabase';
import { Trophy, ArrowLeft, Save, Plus, Minus, CheckCircle } from 'lucide-react';

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

    const [scoreA, setScoreA] = useState(0);
    const [scoreB, setScoreB] = useState(0);
    const [setsA, setSetsA] = useState(0);
    const [setsB, setSetsB] = useState(0);

    useEffect(() => {
        if (match?.score) {
            setSetsA(match.score.setsA ?? match.score.sets_a ?? 0);
            setSetsB(match.score.setsB ?? match.score.sets_b ?? 0);
        }
    }, [match]);

    const handleUpdateScore = async (isFinished = false) => {
        try {
            await updateData(id, {
                score: {
                    setsA,
                    setsB,
                    pointsPerSet: [...(match?.score?.pointsPerSet || []), { a: scoreA, b: scoreB }]
                },
                status: isFinished ? 'finished' : 'in_progress'
            });
            if (isFinished) navigate('/matches');
        } catch (err) {
            console.error("Error al actualizar marcador:", err);
        }
    };

    if (!match || !teamA || !teamB) return <div className="p-8 text-center text-slate-500">Cargando datos del partido...</div>;

    const logoA = teamA.logo_url || teamA.logoUrl;
    const logoB = teamB.logo_url || teamB.logoUrl;

    return (
        <div className="space-y-6">
            <div className="flex items-center space-x-4">
                <button onClick={() => navigate('/matches')} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                    <ArrowLeft size={24} />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Anotación en Vivo</h1>
                    <p className="text-xs text-slate-500">{teamA.name} vs {teamB.name}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Team A */}
                <div className="card flex flex-col items-center p-8 space-y-6 border-b-8 border-primary shadow-lg">
                    <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center overflow-hidden border-2 border-primary shrink-0">
                        {logoA ? <img src={logoA} alt="" className="w-full h-full object-cover" /> : <Trophy size={40} className="text-slate-300" />}
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 text-center">{teamA.name}</h2>
                    <div className="text-7xl font-black text-primary">{scoreA}</div>
                    <div className="flex space-x-4">
                        <button onClick={() => setScoreA(prev => Math.max(0, prev - 1))} className="p-4 bg-slate-100 rounded-2xl hover:bg-slate-200 text-slate-700 transition-colors"><Minus size={24} /></button>
                        <button onClick={() => setScoreA(prev => prev + 1)} className="p-4 bg-primary text-white rounded-2xl hover:bg-primary-light transition-colors"><Plus size={24} /></button>
                    </div>
                    <div className="text-xl font-bold text-slate-700">Sets Ganados: {setsA}</div>
                    <button onClick={() => setSetsA(prev => prev + 1)} className="btn btn-primary w-full py-3">Ganar Set</button>
                </div>

                {/* Team B */}
                <div className="card flex flex-col items-center p-8 space-y-6 border-b-8 border-secondary shadow-lg">
                    <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center overflow-hidden border-2 border-secondary shrink-0">
                        {logoB ? <img src={logoB} alt="" className="w-full h-full object-cover" /> : <Trophy size={40} className="text-slate-300" />}
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 text-center">{teamB.name}</h2>
                    <div className="text-7xl font-black text-secondary">{scoreB}</div>
                    <div className="flex space-x-4">
                        <button onClick={() => setScoreB(prev => Math.max(0, prev - 1))} className="p-4 bg-slate-100 rounded-2xl hover:bg-slate-200 text-slate-700 transition-colors"><Minus size={24} /></button>
                        <button onClick={() => setScoreB(prev => prev + 1)} className="p-4 bg-secondary text-white rounded-2xl hover:bg-secondary-light transition-colors"><Plus size={24} /></button>
                    </div>
                    <div className="text-xl font-bold text-slate-700">Sets Ganados: {setsB}</div>
                    <button onClick={() => setSetsB(prev => prev + 1)} className="btn btn-secondary w-full py-3">Ganar Set</button>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-6">
                <button onClick={() => handleUpdateScore(false)} className="flex-1 btn bg-slate-800 hover:bg-slate-900 text-white py-4 flex items-center justify-center space-x-2">
                    <Save size={20} />
                    <span>Guardar Progreso</span>
                </button>
                <button onClick={() => handleUpdateScore(true)} className="flex-1 btn btn-primary py-4 flex items-center justify-center space-x-2">
                    <CheckCircle size={20} />
                    <span>Finalizar Partido</span>
                </button>
            </div>
        </div>
    );
};

export default MatchScorer;
