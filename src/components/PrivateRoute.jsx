import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import PendingApproval from './PendingApproval';

const PrivateRoute = ({ children, roles = [] }) => {
    const { currentUser, userData, loading, isSuperAdmin, isAdmin } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
                <div className="flex flex-col items-center space-y-3">
                    <div className="w-10 h-10 border-4 border-secondary border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-slate-400 text-sm font-medium">Verificando credenciales...</span>
                </div>
            </div>
        );
    }

    if (!currentUser) {
        return <Navigate to="/login" replace />;
    }

    // Si la cuenta está en estado pendiente de aprobación y no es superadmin/admin, mostrar pantalla de espera
    if (userData?.role === 'pending' && !isAdmin && !isSuperAdmin) {
        return <PendingApproval />;
    }

    // Verificación de roles requeridos
    if (roles.length > 0) {
        const userRole = isSuperAdmin ? 'admin' : (userData?.role || 'pending');
        if (!roles.includes(userRole)) {
            return <Navigate to="/" replace />;
        }
    }

    return children;
};

export default PrivateRoute;

