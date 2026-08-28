import React from 'react';
import { useLeague } from '../context/LeagueContext';
import { Trophy, ChevronDown, Layers } from 'lucide-react';

const LeagueSelector = ({ className = '' }) => {
    const { leagues, selectedLeague, setSelectedLeague } = useLeague();

    return (
        <div className={`relative inline-block text-left ${className}`}>
            <div className="flex items-center space-x-2 bg-primary-light/80 hover:bg-primary-light border border-white/20 rounded-xl px-3 py-1.5 transition-all text-white text-xs md:text-sm shadow-sm">
                <Trophy size={16} className="text-secondary shrink-0" />
                <select
                    value={selectedLeague}
                    onChange={(e) => setSelectedLeague(e.target.value)}
                    className="bg-transparent text-white font-medium focus:outline-none cursor-pointer pr-2 border-none appearance-none"
                    aria-label="Seleccionar Liga"
                >
                    {leagues.map((league) => (
                        <option key={league.id || league.slug} value={league.id || league.slug} className="bg-slate-800 text-white py-1">
                            {league.name}
                        </option>
                    ))}
                </select>
                <ChevronDown size={14} className="text-slate-300 pointer-events-none" />
            </div>
        </div>
    );
};

export default LeagueSelector;
