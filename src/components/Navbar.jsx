import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
    History,
    Users,
    UserCircle,
    LayoutDashboard,
    Calendar,
    Trophy,
    FileText,
    Settings,
    ShieldAlert,
    LogOut,
    ArrowRightLeft
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import LeagueSelector from './LeagueSelector';

const Navbar = () => {
    const { userData, currentUser, isSuperAdmin, isAdmin, isDelegate, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        try {
            await logout();
            navigate('/login');
        } catch (error) {
            console.error("Fallo al cerrar sesión", error);
        }
    };

    const navItems = [
        { name: 'Dashboard', path: '/', icon: LayoutDashboard },
        { name: 'Tabla', path: '/standings', icon: Trophy },
        { name: 'Partidos', path: '/matches', icon: Calendar },
        { name: 'Equipos', path: '/teams', icon: ShieldAlert },
        { name: 'Jugadores', path: '/players', icon: Users },
        { name: 'Traspasos', path: '/transfers', icon: ArrowRightLeft },
        { name: 'Sanciones', path: '/sanctions', icon: History },
        { name: 'Actas', path: '/meetings', icon: FileText }
    ];

    if (isAdmin) {
        navItems.push({ name: 'Panel Admin', path: '/admin', icon: Settings });
    }

    return (
        <>
            {/* Desktop Sidebar */}
            <nav className="hidden md:flex flex-col w-64 bg-primary text-white h-screen sticky top-0 shadow-xl">
                <div className="p-6 border-b border-primary-light flex flex-col space-y-4">
                    <div className="flex items-center space-x-3">
                        <img src="/logo.jpg" alt="LVC Logo" className="w-10 h-10 object-contain bg-white rounded-full p-1 shadow" />
                        <div>
                            <h1 className="text-xl font-extrabold tracking-wide">LVC</h1>
                            <p className="text-[10px] text-slate-300">Voleibol Comayagua</p>
                        </div>
                    </div>
                    {/* League Switcher in Desktop Sidebar */}
                    <div className="pt-2">
                        <LeagueSelector className="w-full" />
                    </div>
                </div>

                <div className="flex-1 py-4 space-y-1 overflow-y-auto">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) =>
                                `flex items-center space-x-3 px-6 py-3 text-sm font-medium transition-colors ${isActive ? 'bg-secondary text-white border-r-4 border-white font-bold' : 'hover:bg-primary-light text-slate-300'
                                }`
                            }
                        >
                            <item.icon size={20} />
                            <span>{item.name}</span>
                        </NavLink>
                    ))}
                </div>

                {/* Perfil & Rol Footer */}
                <div className="p-4 border-t border-primary-light space-y-3">
                    <div className="px-3 py-2 bg-slate-900/40 rounded-xl border border-slate-700/50">
                        <div className="flex items-center space-x-2">
                            <div className="w-7 h-7 rounded-full bg-secondary text-white font-bold text-xs flex items-center justify-center shrink-0">
                                {(userData?.full_name || currentUser?.email || 'U').charAt(0).toUpperCase()}
                            </div>
                            <div className="overflow-hidden flex-1">
                                <p className="text-xs font-bold text-white truncate">{userData?.full_name || 'Usuario'}</p>
                                <p className="text-[10px] text-slate-300 truncate">{currentUser?.email}</p>
                            </div>
                        </div>
                        <div className="mt-2 pt-1 border-t border-slate-700/40 flex items-center justify-between">
                            <span className="text-[10px] text-slate-400">Rol:</span>
                            {isSuperAdmin ? (
                                <span className="bg-amber-400 text-slate-900 text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow-sm">
                                    ⭐ Super Usuario
                                </span>
                            ) : isAdmin ? (
                                <span className="bg-primary-light text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                                    🛡️ Administrativo
                                </span>
                            ) : (
                                <span className="bg-teal-600/90 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
                                    👁️ Delegado Liga
                                </span>
                            )}
                        </div>
                    </div>

                    <button
                        onClick={handleLogout}
                        className="flex items-center space-x-3 px-3 py-2.5 w-full text-slate-300 hover:bg-red-500/20 hover:text-red-300 transition-colors rounded-lg text-xs"
                    >
                        <LogOut size={16} />
                        <span>Cerrar Sesión</span>
                    </button>
                </div>
            </nav>

            {/* Mobile Bottom Nav */}
            <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 md:hidden flex justify-around items-center h-16 z-50 shadow-2xl">
                {navItems.slice(0, 5).map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) =>
                            `flex flex-col items-center justify-center w-full h-full transition-colors ${isActive ? 'text-secondary font-bold' : 'text-slate-500'
                            }`
                        }
                    >
                        <item.icon size={22} />
                        <span className="text-[10px] mt-1">{item.name}</span>
                    </NavLink>
                ))}
            </nav>

            {/* Mobile Top Header */}
            <header className="md:hidden flex items-center justify-between px-4 h-16 bg-primary text-white sticky top-0 z-40 shadow-lg">
                <div className="text-lg font-bold flex items-center space-x-2">
                    <img src="/logo.jpg" alt="LVC Logo" className="w-8 h-8 object-contain bg-white rounded-full p-1" />
                    <span>LVC</span>
                </div>
                <div className="flex items-center space-x-2">
                    <LeagueSelector />
                    <button onClick={handleLogout} className="text-white p-1" title="Cerrar Sesión">
                        <LogOut size={20} />
                    </button>
                </div>
            </header>
        </>
    );
};

export default Navbar;
