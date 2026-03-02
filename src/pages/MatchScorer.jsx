import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useFirestore } from '../hooks/useFirestore';
import { Trophy, ArrowLeft, Save, Plus, Minus } from 'lucide-react';

const MatchScorer = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { data: matches, updateData } = useFirestore('matches');
    const { data: teams } = useFirestore('teams');

    const match = matches.find(m => m.id === id);
    const teamA = teams.find(t => t.id === match?.teamAId);
    const teamB = teams.find(t => t.id === match?.teamBId);

    const [scoreA, setScoreA] = useState(0);
    const [scoreB, setScoreB] = useState(0);
    const [setsA, setSetsA] = useState(0);
    const [setsB, setSetsB] = useState(0);

    useEffect(() => {
        if (match) {
            setSetsA(match.score.setsA || 0);
            setSetsB(match.score.setsB || 0);
        }
    }, [match]);

    const handleUpdateScore = async (isFinished = false) => {
        try {
            await updateData(id, {
                score: {
                    setsA,
                    setsB,
                    pointsPerSet: [...(match.score.pointsPerSet || []), { a: scoreA, b: scoreB }]
                },
                status: isFinished ? 'finished' : 'live'
            });
            if (isFinished) navigate('/matches');
        } catch (err) {
            console.error(err);
        }
    };

    if (!match || !teamA || !teamB) return <div>Cargando partido...</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center space-x-4">
                <button onClick={() => navigate('/matches')} className="p-2 hover:bg-slate-100 rounded-full">
                    <ArrowLeft />
                </button>
                <h1 className="text-2xl font-bold">Anotación en Vivo</h1>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Team A */}
                <div className="card flex flex-col items-center p-8 space-y-6 border-b-8 border-primary">
                    <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center overflow-hidden border-2 border-primary">
                        {teamA.logoUrl ? <img src={teamA.logoUrl} alt="" className="w-full h-full object-cover" /> : <Trophy size={40} className="text-slate-300" />}
                    </div>
                    <h2 className="text-2xl font-bold">{teamA.name}</h2>
                    <div className="text-7xl font-black text-primary">{scoreA}</div>
                    <div className="flex space-x-4">
                        <button onClick={() => setScoreA(prev => Math.max(0, prev - 1))} className="p-4 bg-slate-100 rounded-xl hover:bg-slate-200"><Minus size={24} /></button>
                        <button onClick={() => setScoreA(prev => prev + 1)} className="p-4 bg-primary text-white rounded-xl hover:bg-primary-light"><Plus size={24} /></button>
                    </div>
                    <div className="text-xl font-bold">Sets: {setsA}</div>
                    <button onClick={() => setSetsA(prev => prev + 1)} className="btn-primary w-full">Ganar Set</button>
                </div>

                {/* Team B */}
                <div className="card flex flex-col items-center p-8 space-y-6 border-b-8 border-secondary">
                    <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center overflow-hidden border-2 border-secondary">
                        {teamB.logoUrl ? <img src={teamB.logoUrl} alt="" className="w-full h-full object-cover" /> : <Trophy size={40} className="text-slate-300" />}
                    </div>
                    <h2 className="text-2xl font-bold">{teamB.name}</h2>
                    <div className="text-7xl font-black text-secondary">{scoreB}</div>
                    <div className="flex space-x-4">
                        <button onClick={() => setScoreB(prev => Math.max(0, prev - 1))} className="p-4 bg-slate-100 rounded-xl hover:bg-slate-200"><Minus size={24} /></button>
                        <button onClick={() => setScoreB(prev => prev + 1)} className="p-4 bg-secondary text-white rounded-xl hover:bg-secondary-light"><Plus size={24} /></button>
                    </div>
                    <div className="text-xl font-bold">Sets: {setsB}</div>
                    <button onClick={() => setSetsB(prev => prev + 1)} className="btn-secondary w-full">Ganar Set</button>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-6">
                <button onClick={() => handleUpdateScore(false)} className="flex-1 btn-primary bg-slate-800 hover:bg-slate-700 py-4 flex items-center justify-center space-x-2">
                    <Save size={20} />
                    <span>Guardar Progreso</span>
                </button>
                <button onClick={() => handleUpdateScore(true)} className="flex-1 btn-primary py-4 flex items-center justify-center space-x-2">
                    <CheckCircle size={20} />
                    <span>Finalizar Partido</span>
                </button>
            </div>
        </div>
    );
};

export default MatchScorer;
