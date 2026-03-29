import React from 'react';
import { NavLink } from 'react-router-dom';
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
    LogOut
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Navbar = () => {
    const { userData, logout } = useAuth();
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
    ];

    if (userData?.role === 'admin') {
        navItems.push({ name: 'Sanciones', path: '/sanctions', icon: History });
        navItems.push({ name: 'Actas', path: '/meetings', icon: FileText });
        navItems.push({ name: 'Admin', path: '/admin', icon: Settings });
    }

    return (
        <>
            {/* Desktop Sidebar */}
            <nav className="hidden md:flex flex-col w-64 bg-primary text-white h-screen sticky top-0">
                <div className="p-6 text-2xl font-bold border-b border-primary-light flex items-center space-x-3">
                    <img src="/logo.jpg" alt="LVC Logo" className="w-10 h-10 object-contain bg-white rounded-full p-1" />
                    <span>LVC</span>
                </div>
                <div className="flex-1 py-6 space-y-2">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) =>
                                `flex items-center space-x-3 px-6 py-3 transition-colors ${isActive ? 'bg-secondary text-white border-r-4 border-white' : 'hover:bg-primary-light text-slate-300'
                                }`
                            }
                        >
                            <item.icon size={20} />
                            <span>{item.name}</span>
                        </NavLink>
                    ))}
                </div>
                <div className="p-4 border-t border-primary-light">
                    <button
                        onClick={handleLogout}
                        className="flex items-center space-x-3 px-6 py-3 w-full text-slate-300 hover:bg-primary-light hover:text-white transition-colors rounded-lg"
                    >
                        <LogOut size={20} />
                        <span>Cerrar Sesión</span>
                    </button>
                </div>
            </nav>

            {/* Mobile Bottom Nav */}
            <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 md:hidden flex justify-around items-center h-16 z-50">
                {navItems.slice(0, 5).map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) =>
                            `flex flex-col items-center justify-center w-full h-full transition-colors ${isActive ? 'text-secondary' : 'text-slate-500'
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
                <div className="text-xl font-bold flex items-center space-x-2">
                    <img src="/logo.jpg" alt="LVC Logo" className="w-8 h-8 object-contain bg-white rounded-full p-1" />
                    <span>LVC</span>
                </div>
                <div className="flex items-center space-x-4">
                    <NavLink to="/profile" className="text-white">
                        <UserCircle size={28} />
                    </NavLink>
                    <button onClick={handleLogout} className="text-white">
                        <LogOut size={24} />
                    </button>
                </div>
            </header>
        </>
    );
};

export default Navbar;
