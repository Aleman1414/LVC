import React from 'react';
import { useAuth } from './context/AuthContext';
import { Trophy, Calendar, Users, History } from 'lucide-react';

const Dashboard = () => {
    const { userData } = useAuth();

    const stats = [
        { name: 'Equipos', value: '12', icon: Trophy, color: 'text-primary' },
        { name: 'Jugadores', value: '148', icon: Users, color: 'text-secondary' },
        { name: 'Próximos Partidos', value: '4', icon: Calendar, color: 'text-blue-500' },
        { name: 'Sanciones Activas', value: '3', icon: History, color: 'text-red-500' },
    ];

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-primary">¡Hola, {userData?.displayName || 'Visitante'}! 👋</h1>
                <p className="text-slate-500">Bienvenido al panel de control de la Liga de Voleibol de Comayagua.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat) => (
                    <div key={stat.name} className="card flex items-center space-x-4 border-l-4 border-primary">
                        <div className={`p-3 rounded-full bg-slate-100 ${stat.color}`}>
                            <stat.icon size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500 font-medium">{stat.name}</p>
                            <p className="text-2xl font-bold">{stat.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="card">
                    <h2 className="text-xl font-bold mb-4">Próximos Partidos</h2>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                            <div className="flex items-center space-x-3 text-sm">
                                <span className="font-bold">Lions</span>
                                <span className="text-slate-300">vs</span>
                                <span className="font-bold">Titanes</span>
                            </div>
                            <div className="text-xs text-slate-500">Sábado 18:00</div>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                            <div className="flex items-center space-x-3 text-sm">
                                <span className="font-bold">Phoenix</span>
                                <span className="text-slate-300">vs</span>
                                <span className="font-bold">Wolves</span>
                            </div>
                            <div className="text-xs text-slate-500">Domingo 15:30</div>
                        </div>
                    </div>
                </div>

                <div className="card">
                    <h2 className="text-xl font-bold mb-4">Últimas Noticias</h2>
                    <div className="space-y-2 text-sm text-slate-600">
                        <p>• Inscripciones abiertas para la nueva temporada.</p>
                        <p>• Acta de la reunión del 20 de febrero disponible.</p>
                        <p>• Nuevas reglas de arbitraje publicadas.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
