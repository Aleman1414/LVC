import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Clock, RefreshCw, LogOut, ShieldCheck, Eye, HelpCircle } from 'lucide-react';

const PendingApproval = () => {
    const { currentUser, userData, logout, refreshProfile } = useAuth();
    const [refreshing, setRefreshing] = useState(false);
    const [statusMessage, setStatusMessage] = useState('');

    const handleRefresh = async () => {
        setRefreshing(true);
        setStatusMessage('');
        try {
            await refreshProfile();
            setStatusMessage('Estado verificado. Si tu rol no ha cambiado, consulta con el Super Usuario.');
        } catch (err) {
            console.error(err);
            setStatusMessage('Error al verificar estado. Intenta nuevamente.');
        } finally {
            setRefreshing(false);
        }
    };

    const handleLogout = async () => {
        try {
            await logout();
        } catch (err) {
            console.error('Error al cerrar sesión', err);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4">
            <div className="w-full max-w-lg bg-white dark:bg-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 border border-slate-700/50 text-center">
                {/* Logo e Icono */}
                <div className="relative mx-auto w-20 h-20 mb-6">
                    <div className="w-20 h-20 rounded-2xl bg-amber-500/10 border-2 border-amber-500/30 flex items-center justify-center text-amber-500 animate-pulse">
                        <Clock size={42} />
                    </div>
                    <img
                        src="/logo.jpg"
                        alt="LVC Logo"
                        className="w-8 h-8 rounded-full border-2 border-white absolute -bottom-1 -right-1 shadow-md object-contain bg-white"
                    />
                </div>

                {/* Título y estado */}
                <div className="inline-flex items-center space-x-2 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-xs font-bold px-3 py-1 rounded-full border border-amber-200 dark:border-amber-800 mb-3">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
                    <span>Acceso Pendiente de Aprobación</span>
                </div>

                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 dark:text-white">
                    ¡Hola, {userData?.full_name || currentUser?.email?.split('@')[0] || 'Usuario'}!
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                    Tu cuenta con correo <strong className="text-slate-700 dark:text-slate-200">{currentUser?.email}</strong> fue registrada exitosamente en el sistema de la Liga de Voleibol de Comayagua (LVC).
                </p>

                {/* Explicación de Roles */}
                <div className="my-6 bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/60 text-left space-y-3">
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center space-x-1.5">
                        <HelpCircle size={15} className="text-primary shrink-0" />
                        <span>¿Por qué veo esta pantalla?</span>
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                        Por motivos de seguridad, las nuevas cuentas requieren ser aprobadas por un administrador antes de ingresar. Se te asignará uno de los dos roles oficiales:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
                            <div className="flex items-center space-x-1.5 font-bold text-primary mb-1">
                                <ShieldCheck size={14} />
                                <span>Administrativo</span>
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">Gestión completa de equipos, partidos y sanciones.</p>
                        </div>
                        <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
                            <div className="flex items-center space-x-1.5 font-bold text-secondary mb-1">
                                <Eye size={14} />
                                <span>Delegado de Liga</span>
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">Observación y consulta de partidos, actas y tablas.</p>
                        </div>
                    </div>
                </div>

                {statusMessage && (
                    <div className="text-xs text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 py-2 px-3 rounded-lg mb-4">
                        {statusMessage}
                    </div>
                )}

                {/* Acciones */}
                <div className="space-y-3">
                    <button
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className="w-full btn btn-primary flex items-center justify-center space-x-2 py-3 shadow-md"
                    >
                        <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                        <span>{refreshing ? 'Comprobando...' : 'Comprobar Aprobación'}</span>
                    </button>

                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center justify-center space-x-2 text-xs text-slate-400 hover:text-red-500 py-2 transition-colors"
                    >
                        <LogOut size={14} />
                        <span>Cerrar Sesión</span>
                    </button>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700/50 text-[11px] text-slate-400">
                    ¿Necesitas acceso urgente? Contacta al Super Usuario: <span className="font-semibold text-slate-600 dark:text-slate-300">angel.aleman1414@gmail.com</span>
                </div>
            </div>
        </div>
    );
};

export default PendingApproval;
