import React, { useState, useMemo } from 'react';
import { useAuth, SUPERADMIN_EMAIL } from '../context/AuthContext';
import { useSupabase } from '../hooks/useSupabase';
import {
    ShieldCheck,
    Users,
    Eye,
    Clock,
    UserPlus,
    Search,
    Filter,
    CheckCircle,
    XCircle,
    Trash2,
    Lock,
    Crown,
    ArrowRightLeft,
    AlertCircle,
    Info,
    Mail,
    Calendar,
    ChevronDown,
    RefreshCw
} from 'lucide-react';

const Admin = () => {
    const { currentUser, userData, isSuperAdmin, signup } = useAuth();
    const { data: profiles, loading, updateData, deleteData, fetchData } = useSupabase('profiles');

    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('all'); // 'all', 'admin', 'delegado', 'pending'
    const [actionLoading, setActionLoading] = useState(null); // id of profile being updated
    const [notification, setNotification] = useState({ type: '', message: '' });

    // Estado para modal de crear cuenta
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newAccount, setNewAccount] = useState({
        fullName: '',
        email: '',
        password: '',
        role: 'delegado'
    });
    const [createError, setCreateError] = useState('');
    const [createLoading, setCreateLoading] = useState(false);

    // Filtrar perfiles
    const filteredProfiles = useMemo(() => {
        const query = searchTerm.toLowerCase().trim();
        return (profiles || []).filter(p => {
            const matchesQuery = (p.full_name || '').toLowerCase().includes(query) ||
                (p.email || '').toLowerCase().includes(query);

            const isSuper = (p.email || '').toLowerCase().trim() === SUPERADMIN_EMAIL;
            const currentRole = isSuper ? 'admin' : (p.role === 'user' ? 'delegado' : (p.role || 'pending'));

            const matchesRole = roleFilter === 'all' || currentRole === roleFilter;
            return matchesQuery && matchesRole;
        });
    }, [profiles, searchTerm, roleFilter]);

    // Estadísticas
    const stats = useMemo(() => {
        const list = profiles || [];
        let admins = 0;
        let delegates = 0;
        let pendings = 0;

        list.forEach(p => {
            const isSuper = (p.email || '').toLowerCase().trim() === SUPERADMIN_EMAIL;
            const role = isSuper ? 'admin' : (p.role === 'user' ? 'delegado' : (p.role || 'pending'));
            if (role === 'admin') admins++;
            else if (role === 'delegado') delegates++;
            else if (role === 'pending') pendings++;
        });

        return {
            total: list.length,
            admins,
            delegates,
            pendings
        };
    }, [profiles]);

    // Cuentas pendientes de aprobación
    const pendingRequests = useMemo(() => {
        return (profiles || []).filter(p => {
            const isSuper = (p.email || '').toLowerCase().trim() === SUPERADMIN_EMAIL;
            return !isSuper && (p.role === 'pending' || !p.role);
        });
    }, [profiles]);

    const showNotification = (type, message) => {
        setNotification({ type, message });
        setTimeout(() => setNotification({ type: '', message: '' }), 5000);
    };

    // Cambiar rol de un usuario
    const handleRoleChange = async (profileId, email, newRole) => {
        const normalizedEmail = (email || '').toLowerCase().trim();
        if (normalizedEmail === SUPERADMIN_EMAIL) {
            showNotification('error', 'El Super Usuario (angel.aleman1414@gmail.com) no puede ser modificado.');
            return;
        }

        try {
            setActionLoading(profileId);
            await updateData(profileId, { role: newRole });
            showNotification('success', `Rol actualizado a "${newRole === 'admin' ? 'Administrativo' : 'Delegado de Liga'}" para ${email}.`);
        } catch (err) {
            console.error('Error al actualizar rol:', err);
            showNotification('error', 'No se pudo actualizar el rol. Intenta de nuevo.');
        } finally {
            setActionLoading(null);
        }
    };

    // Eliminar / Rechazar acceso
    const handleDeleteUser = async (profileId, email) => {
        const normalizedEmail = (email || '').toLowerCase().trim();
        if (normalizedEmail === SUPERADMIN_EMAIL) {
            showNotification('error', 'El Super Usuario no puede ser eliminado.');
            return;
        }

        if (!window.confirm(`¿Estás seguro de revocar y eliminar el acceso de ${email}?`)) {
            return;
        }

        try {
            setActionLoading(profileId);
            await deleteData(profileId);
            showNotification('success', `Acceso revocado y cuenta eliminada: ${email}.`);
        } catch (err) {
            console.error('Error al eliminar usuario:', err);
            showNotification('error', 'Error al eliminar el usuario.');
        } finally {
            setActionLoading(null);
        }
    };

    // Crear cuenta directamente desde el panel
    const handleCreateAccount = async (e) => {
        e.preventDefault();
        setCreateError('');

        if (!newAccount.fullName.trim() || !newAccount.email.trim() || !newAccount.password.trim()) {
            setCreateError('Todos los campos son obligatorios.');
            return;
        }

        if (newAccount.password.length < 6) {
            setCreateError('La contraseña debe tener al menos 6 caracteres.');
            return;
        }

        try {
            setCreateLoading(true);
            await signup(
                newAccount.email.trim(),
                newAccount.password,
                newAccount.fullName.trim(),
                newAccount.role
            );
            showNotification('success', `Cuenta creada con éxito con rol "${newAccount.role === 'admin' ? 'Administrativo' : 'Delegado de Liga'}".`);
            setIsCreateModalOpen(false);
            setNewAccount({ fullName: '', email: '', password: '', role: 'delegado' });
            fetchData();
        } catch (err) {
            console.error('Error al crear cuenta:', err);
            setCreateError(err.message || 'Error al crear la cuenta en el sistema.');
        } finally {
            setCreateLoading(false);
        }
    };

    return (
        <div className="space-y-8">
            {/* Header del Panel */}
            <div className="bg-gradient-to-r from-primary via-slate-900 to-primary-light text-white p-6 sm:p-8 rounded-3xl shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <div className="flex items-center space-x-2 text-secondary mb-2">
                        <Crown size={20} className="animate-bounce" />
                        <span className="font-bold text-xs uppercase tracking-widest">Panel de Control & Acceso</span>
                    </div>
                    <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">Gestión de Acceso y Cuentas</h1>
                    <p className="text-slate-300 text-sm mt-1 max-w-2xl">
                        Control de permisos, autorización de nuevas cuentas y asignación de roles de la Liga de Voleibol de Comayagua.
                    </p>
                    <div className="mt-3 flex items-center space-x-2 text-xs text-slate-300">
                        <span>Sesión activa:</span>
                        <strong className="text-white">{userData?.full_name || currentUser?.email}</strong>
                        {isSuperAdmin ? (
                            <span className="bg-amber-400 text-slate-900 px-2 py-0.5 rounded-full font-bold text-[10px] flex items-center space-x-1">
                                <Crown size={11} />
                                <span>Super Usuario</span>
                            </span>
                        ) : (
                            <span className="bg-primary-light text-white px-2 py-0.5 rounded-full font-bold text-[10px]">
                                Administrativo
                            </span>
                        )}
                    </div>
                </div>

                <div className="flex items-center space-x-3 w-full sm:w-auto">
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="btn btn-secondary flex items-center justify-center space-x-2 py-3 px-5 shadow-lg w-full sm:w-auto"
                    >
                        <UserPlus size={18} />
                        <span>Nueva Cuenta</span>
                    </button>
                    <button
                        onClick={() => fetchData()}
                        className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors shrink-0"
                        title="Refrescar lista"
                    >
                        <RefreshCw size={18} />
                    </button>
                </div>
            </div>

            {/* Notificación flotante / aviso */}
            {notification.message && (
                <div
                    className={`p-4 rounded-2xl flex items-center space-x-3 transition-all ${
                        notification.type === 'error'
                            ? 'bg-red-100 text-red-800 border border-red-300'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    }`}
                >
                    {notification.type === 'error' ? (
                        <AlertCircle size={20} className="shrink-0" />
                    ) : (
                        <CheckCircle size={20} className="shrink-0" />
                    )}
                    <span className="text-sm font-semibold">{notification.message}</span>
                </div>
            )}

            {/* Tarjetas de Métricas de Roles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                <div className="card flex items-center space-x-4 border-l-4 border-slate-700 hover:shadow-lg transition-shadow">
                    <div className="p-3 rounded-2xl bg-slate-100 text-slate-700">
                        <Users size={24} />
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Total Cuentas</p>
                        <p className="text-2xl font-black text-slate-800">{stats.total}</p>
                    </div>
                </div>

                <div className="card flex items-center space-x-4 border-l-4 border-primary hover:shadow-lg transition-shadow">
                    <div className="p-3 rounded-2xl bg-primary/10 text-primary">
                        <ShieldCheck size={24} />
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Administrativos</p>
                        <p className="text-2xl font-black text-primary">{stats.admins}</p>
                        <span className="text-[10px] text-slate-400">Control y edición total</span>
                    </div>
                </div>

                <div className="card flex items-center space-x-4 border-l-4 border-teal-600 hover:shadow-lg transition-shadow">
                    <div className="p-3 rounded-2xl bg-teal-50 text-teal-600">
                        <Eye size={24} />
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Delegados de Liga</p>
                        <p className="text-2xl font-black text-teal-700">{stats.delegates}</p>
                        <span className="text-[10px] text-slate-400">Modo Solo Lectura</span>
                    </div>
                </div>

                <div className={`card flex items-center space-x-4 border-l-4 ${stats.pendings > 0 ? 'border-amber-500 bg-amber-50/40' : 'border-slate-300'} hover:shadow-lg transition-shadow`}>
                    <div className={`p-3 rounded-2xl ${stats.pendings > 0 ? 'bg-amber-100 text-amber-700 animate-pulse' : 'bg-slate-100 text-slate-400'}`}>
                        <Clock size={24} />
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Por Autorizar</p>
                        <p className={`text-2xl font-black ${stats.pendings > 0 ? 'text-amber-600' : 'text-slate-500'}`}>
                            {stats.pendings}
                        </p>
                        <span className="text-[10px] text-slate-400">Nuevas solicitudes</span>
                    </div>
                </div>
            </div>

            {/* SECCIÓN 1: Solicitudes Pendientes de Acceso (Si existen) */}
            {pendingRequests.length > 0 && (
                <div className="card border-2 border-amber-300 bg-gradient-to-br from-amber-50/70 to-white shadow-md">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4 pb-3 border-b border-amber-200">
                        <div className="flex items-center space-x-2">
                            <span className="p-2 rounded-xl bg-amber-500 text-white shadow-sm">
                                <Clock size={20} />
                            </span>
                            <div>
                                <h2 className="text-lg font-bold text-amber-900">
                                    Solicitudes de Nuevas Cuentas ({pendingRequests.length})
                                </h2>
                                <p className="text-xs text-amber-700">
                                    Estos usuarios se registraron recientemente y están esperando que les asignes un rol de acceso.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {pendingRequests.map((req) => (
                            <div
                                key={req.id}
                                className="bg-white p-4 rounded-2xl border border-amber-200 shadow-sm flex flex-col justify-between space-y-3"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-11 h-11 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-600 text-sm">
                                            {(req.full_name || req.email || 'U').charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <h3 className="font-extrabold text-slate-800 text-sm">{req.full_name || 'Sin nombre'}</h3>
                                            <p className="text-xs text-slate-500 flex items-center space-x-1">
                                                <Mail size={12} />
                                                <span>{req.email}</span>
                                            </p>
                                            <p className="text-[11px] text-slate-400 mt-0.5">
                                                Registrado: {req.created_at ? new Date(req.created_at).toLocaleDateString() : 'Reciente'}
                                            </p>
                                        </div>
                                    </div>
                                    <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-200">
                                        Pendiente
                                    </span>
                                </div>

                                <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-2">
                                    <button
                                        onClick={() => handleRoleChange(req.id, req.email, 'delegado')}
                                        disabled={actionLoading === req.id}
                                        className="btn bg-teal-600 hover:bg-teal-700 text-white text-xs py-2 px-3 flex-1 flex items-center justify-center space-x-1.5 shadow-sm"
                                        title="Permite al usuario observar datos, partidos y actas pero sin modificar nada"
                                    >
                                        <Eye size={14} />
                                        <span>Aprobar como Delegado</span>
                                    </button>

                                    <button
                                        onClick={() => handleRoleChange(req.id, req.email, 'admin')}
                                        disabled={actionLoading === req.id}
                                        className="btn btn-primary text-xs py-2 px-3 flex-1 flex items-center justify-center space-x-1.5 shadow-sm"
                                        title="Permite al usuario administrar, editar y cargar resultados"
                                    >
                                        <ShieldCheck size={14} />
                                        <span>Aprobar como Admin</span>
                                    </button>

                                    <button
                                        onClick={() => handleDeleteUser(req.id, req.email)}
                                        disabled={actionLoading === req.id}
                                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Rechazar y eliminar solicitud"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* SECCIÓN 2: Directorio de Usuarios y Roles Activos */}
            <div className="card space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 flex items-center space-x-2">
                            <Users className="text-primary" size={22} />
                            <span>Directorio de Cuentas & Roles</span>
                        </h2>
                        <p className="text-xs text-slate-500 mt-1">
                            Administra los permisos de cada usuario. Las modificaciones se aplican en tiempo real.
                        </p>
                    </div>

                    {/* Buscador y Filtros */}
                    <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto">
                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                            <input
                                type="text"
                                placeholder="Buscar por nombre o correo..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                            />
                        </div>

                        <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl w-full sm:w-auto overflow-x-auto">
                            <button
                                onClick={() => setRoleFilter('all')}
                                className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors ${roleFilter === 'all' ? 'bg-white shadow text-slate-800 font-bold' : 'text-slate-500 hover:text-slate-800'}`}
                            >
                                Todos
                            </button>
                            <button
                                onClick={() => setRoleFilter('admin')}
                                className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors ${roleFilter === 'admin' ? 'bg-white shadow text-primary font-bold' : 'text-slate-500 hover:text-slate-800'}`}
                            >
                                Admin
                            </button>
                            <button
                                onClick={() => setRoleFilter('delegado')}
                                className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors ${roleFilter === 'delegado' ? 'bg-white shadow text-teal-600 font-bold' : 'text-slate-500 hover:text-slate-800'}`}
                            >
                                Delegados
                            </button>
                            <button
                                onClick={() => setRoleFilter('pending')}
                                className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors ${roleFilter === 'pending' ? 'bg-white shadow text-amber-600 font-bold' : 'text-slate-500 hover:text-slate-800'}`}
                            >
                                Pendientes
                            </button>
                        </div>
                    </div>
                </div>

                {/* Tabla de Usuarios */}
                {loading ? (
                    <div className="p-12 text-center text-slate-500 text-sm">
                        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                        <span>Cargando cuentas registradas...</span>
                    </div>
                ) : filteredProfiles.length === 0 ? (
                    <div className="p-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400 text-sm">
                        No se encontraron cuentas que coincidan con la búsqueda o filtro.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/60">
                                    <th className="py-3 px-4 rounded-l-xl">Usuario</th>
                                    <th className="py-3 px-4">Rol Asignado</th>
                                    <th className="py-3 px-4">Nivel de Acceso</th>
                                    <th className="py-3 px-4">Fecha de Alta</th>
                                    <th className="py-3 px-4 text-right rounded-r-xl">Acciones de Gestión</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-sm">
                                {filteredProfiles.map((user) => {
                                    const normalizedEmail = (user.email || '').toLowerCase().trim();
                                    const isSuper = normalizedEmail === SUPERADMIN_EMAIL;
                                    const currentRole = isSuper ? 'admin' : (user.role === 'user' ? 'delegado' : (user.role || 'pending'));

                                    return (
                                        <tr key={user.id} className="hover:bg-slate-50/80 transition-colors">
                                            {/* Usuario */}
                                            <td className="py-3.5 px-4">
                                                <div className="flex items-center space-x-3">
                                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm shrink-0 shadow-sm ${
                                                        isSuper
                                                            ? 'bg-gradient-to-tr from-amber-500 to-amber-300 text-slate-900 ring-2 ring-amber-400'
                                                            : currentRole === 'admin'
                                                            ? 'bg-primary'
                                                            : currentRole === 'delegado'
                                                            ? 'bg-teal-600'
                                                            : 'bg-slate-400'
                                                    }`}>
                                                        {isSuper ? '⭐' : (user.full_name || user.email || 'U').charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-slate-800 flex items-center space-x-1.5">
                                                            <span>{user.full_name || 'Sin nombre asignado'}</span>
                                                            {isSuper && (
                                                                <span className="bg-amber-100 text-amber-800 text-[10px] font-extrabold px-1.5 py-0.2 rounded border border-amber-300">
                                                                    Super User
                                                                </span>
                                                            )}
                                                        </div>
                                                        <span className="text-xs text-slate-500 font-mono">{user.email}</span>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Rol Asignado */}
                                            <td className="py-3.5 px-4">
                                                {isSuper ? (
                                                    <span className="inline-flex items-center space-x-1.5 bg-amber-50 text-amber-800 border border-amber-300 text-xs font-extrabold px-3 py-1 rounded-full shadow-sm">
                                                        <Crown size={13} className="text-amber-600" />
                                                        <span>Super Usuario</span>
                                                    </span>
                                                ) : currentRole === 'admin' ? (
                                                    <span className="inline-flex items-center space-x-1.5 bg-primary/10 text-primary border border-primary/20 text-xs font-bold px-3 py-1 rounded-full">
                                                        <ShieldCheck size={13} />
                                                        <span>Administrativo</span>
                                                    </span>
                                                ) : currentRole === 'delegado' ? (
                                                    <span className="inline-flex items-center space-x-1.5 bg-teal-50 text-teal-700 border border-teal-200 text-xs font-bold px-3 py-1 rounded-full">
                                                        <Eye size={13} />
                                                        <span>Delegado de Liga</span>
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center space-x-1.5 bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold px-3 py-1 rounded-full">
                                                        <Clock size={13} />
                                                        <span>Pendiente</span>
                                                    </span>
                                                )}
                                            </td>

                                            {/* Nivel de Acceso */}
                                            <td className="py-3.5 px-4">
                                                {isSuper ? (
                                                    <span className="text-xs text-amber-700 font-medium bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                                                        Control Maestro Permanente
                                                    </span>
                                                ) : currentRole === 'admin' ? (
                                                    <span className="text-xs text-slate-600 font-medium">
                                                        Edición, creación y anotador
                                                    </span>
                                                ) : currentRole === 'delegado' ? (
                                                    <span className="text-xs text-teal-700 font-medium bg-teal-50 px-2 py-0.5 rounded-md border border-teal-100">
                                                        Solo Observación (Sin cambios)
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-slate-400 italic">
                                                        Sin acceso a la liga
                                                    </span>
                                                )}
                                            </td>

                                            {/* Fecha de Registro */}
                                            <td className="py-3.5 px-4 text-xs text-slate-500 font-mono">
                                                {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/D'}
                                            </td>

                                            {/* Acciones */}
                                            <td className="py-3.5 px-4 text-right">
                                                {isSuper ? (
                                                    <span className="inline-flex items-center space-x-1 text-slate-400 text-xs bg-slate-100 px-2.5 py-1 rounded-lg" title="La cuenta Super Usuario no puede ser modificada">
                                                        <Lock size={12} />
                                                        <span>Protegido</span>
                                                    </span>
                                                ) : (
                                                    <div className="inline-flex items-center space-x-1.5">
                                                        {currentRole !== 'admin' && (
                                                            <button
                                                                onClick={() => handleRoleChange(user.id, user.email, 'admin')}
                                                                disabled={actionLoading === user.id}
                                                                className="btn btn-outline text-xs py-1.5 px-2.5 text-primary border-primary hover:bg-primary hover:text-white transition-colors"
                                                                title="Cambiar a rol Administrativo (acceso total)"
                                                            >
                                                                <ShieldCheck size={13} className="inline mr-1" />
                                                                <span>Hacer Admin</span>
                                                            </button>
                                                        )}

                                                        {currentRole !== 'delegado' && (
                                                            <button
                                                                onClick={() => handleRoleChange(user.id, user.email, 'delegado')}
                                                                disabled={actionLoading === user.id}
                                                                className="btn border border-teal-300 text-teal-700 hover:bg-teal-50 text-xs py-1.5 px-2.5 transition-colors"
                                                                title="Cambiar a rol Delegado de Liga (solo lectura)"
                                                            >
                                                                <Eye size={13} className="inline mr-1" />
                                                                <span>Hacer Delegado</span>
                                                            </button>
                                                        )}

                                                        {currentRole !== 'pending' && (
                                                            <button
                                                                onClick={() => handleRoleChange(user.id, user.email, 'pending')}
                                                                disabled={actionLoading === user.id}
                                                                className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                                                title="Suspender acceso (dejar pendiente)"
                                                            >
                                                                <Clock size={15} />
                                                            </button>
                                                        )}

                                                        <button
                                                            onClick={() => handleDeleteUser(user.id, user.email)}
                                                            disabled={actionLoading === user.id}
                                                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                            title="Revocar acceso y eliminar usuario"
                                                        >
                                                            <Trash2 size={15} />
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* SECCIÓN 3: Guía Normativa de Roles en la LVC */}
            <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-4">
                <h3 className="text-base font-bold text-slate-800 flex items-center space-x-2">
                    <Info size={18} className="text-primary" />
                    <span>Estructura de Roles y Niveles de Acceso LVC</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-600">
                    <div className="p-4 rounded-2xl bg-white border border-amber-200 space-y-2">
                        <div className="flex items-center space-x-2 text-amber-800 font-extrabold text-sm">
                            <Crown size={16} className="text-amber-600" />
                            <span>⭐ Super Usuario</span>
                        </div>
                        <p className="text-slate-500">
                            Asignado exclusivamente a <strong className="text-slate-700">angel.aleman1414@gmail.com</strong>. Cuenta protegida con máxima jerarquía, inmutable e irremovible del sistema.
                        </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-white border border-primary/20 space-y-2">
                        <div className="flex items-center space-x-2 text-primary font-extrabold text-sm">
                            <ShieldCheck size={16} />
                            <span>🛡️ Rol Administrativo</span>
                        </div>
                        <p className="text-slate-500">
                            Capacidad total para programar partidos, registrar marcadores y sets en vivo, dar de alta equipos y jugadores, sancionar y subir actas oficiales.
                        </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-white border border-teal-200 space-y-2">
                        <div className="flex items-center space-x-2 text-teal-700 font-extrabold text-sm">
                            <Eye size={16} />
                            <span>👁️ Delegados de Liga</span>
                        </div>
                        <p className="text-slate-500">
                            Acceso transparente a toda la información de la liga (equipos, jugadores, calendario, actas y clasificaciones) en <strong>modo estricto de solo lectura</strong> sin capacidad de modificación.
                        </p>
                    </div>
                </div>
            </div>

            {/* MODAL: Crear / Invitar Nueva Cuenta */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 sm:p-8 border border-slate-200 space-y-5 animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                            <div className="flex items-center space-x-2">
                                <UserPlus className="text-primary" size={20} />
                                <h3 className="text-lg font-bold text-slate-800">Registrar Nueva Cuenta</h3>
                            </div>
                            <button
                                onClick={() => setIsCreateModalOpen(false)}
                                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
                            >
                                <XCircle size={20} />
                            </button>
                        </div>

                        {createError && (
                            <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-xl flex items-center space-x-2">
                                <AlertCircle size={16} className="shrink-0" />
                                <span>{createError}</span>
                            </div>
                        )}

                        <form onSubmit={handleCreateAccount} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Nombre Completo</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Ej. Juan Pérez"
                                    value={newAccount.fullName}
                                    onChange={(e) => setNewAccount({ ...newAccount, fullName: e.target.value })}
                                    className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Correo Electrónico</label>
                                <input
                                    type="email"
                                    required
                                    placeholder="correo@ejemplo.com"
                                    value={newAccount.email}
                                    onChange={(e) => setNewAccount({ ...newAccount, email: e.target.value })}
                                    className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Contraseña Inicial</label>
                                <input
                                    type="password"
                                    required
                                    placeholder="Mínimo 6 caracteres"
                                    value={newAccount.password}
                                    onChange={(e) => setNewAccount({ ...newAccount, password: e.target.value })}
                                    className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Rol a Asignar</label>
                                <div className="grid grid-cols-2 gap-3 pt-1">
                                    <label
                                        className={`flex flex-col p-3 rounded-xl border cursor-pointer transition-all ${
                                            newAccount.role === 'delegado'
                                                ? 'border-teal-500 bg-teal-50/50 ring-2 ring-teal-500/20'
                                                : 'border-slate-200 hover:border-slate-300'
                                        }`}
                                    >
                                        <input
                                            type="radio"
                                            name="role"
                                            value="delegado"
                                            checked={newAccount.role === 'delegado'}
                                            onChange={() => setNewAccount({ ...newAccount, role: 'delegado' })}
                                            className="sr-only"
                                        />
                                        <span className="text-xs font-bold text-teal-800 flex items-center space-x-1">
                                            <Eye size={14} />
                                            <span>Delegado de Liga</span>
                                        </span>
                                        <span className="text-[10px] text-slate-500 mt-1">Solo puede observar</span>
                                    </label>

                                    <label
                                        className={`flex flex-col p-3 rounded-xl border cursor-pointer transition-all ${
                                            newAccount.role === 'admin'
                                                ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                                                : 'border-slate-200 hover:border-slate-300'
                                        }`}
                                    >
                                        <input
                                            type="radio"
                                            name="role"
                                            value="admin"
                                            checked={newAccount.role === 'admin'}
                                            onChange={() => setNewAccount({ ...newAccount, role: 'admin' })}
                                            className="sr-only"
                                        />
                                        <span className="text-xs font-bold text-primary flex items-center space-x-1">
                                            <ShieldCheck size={14} />
                                            <span>Administrativo</span>
                                        </span>
                                        <span className="text-[10px] text-slate-500 mt-1">Control total</span>
                                    </label>
                                </div>
                            </div>

                            <div className="pt-4 flex items-center justify-end space-x-2">
                                <button
                                    type="button"
                                    onClick={() => setIsCreateModalOpen(false)}
                                    className="btn border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs py-2.5 px-4"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={createLoading}
                                    className="btn btn-primary text-xs py-2.5 px-5 flex items-center space-x-1.5 shadow-md"
                                >
                                    <span>{createLoading ? 'Creando cuenta...' : 'Crear Usuario'}</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Admin;
