import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Trophy, Mail } from 'lucide-react';

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { resetPassword } = useAuth();

    async function handleSubmit(e) {
        e.preventDefault();

        try {
            setMessage('');
            setError('');
            setLoading(true);
            await resetPassword(email);
            setMessage('Revisa tu bandeja de entrada para seguir las instrucciones.');
        } catch (err) {
            setError('Error al enviar el correo de recuperación.');
            console.error(err);
        }
        setLoading(false);
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-primary px-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
                <div className="flex flex-col items-center mb-8">
                    <div className="bg-secondary p-3 rounded-full mb-4">
                        <Mail className="text-white" size={32} />
                    </div>
                    <h2 className="text-3xl font-bold text-primary">Recuperar Acceso</h2>
                </div>

                {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
                        <span>{error}</span>
                    </div>
                )}

                {message && (
                    <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4">
                        <span>{message}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Correo Electrónico</label>
                        <input
                            type="email"
                            required
                            className="input-field"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>

                    <button
                        disabled={loading}
                        type="submit"
                        className="w-full btn-primary py-3 font-semibold text-lg"
                    >
                        {loading ? 'Enviando...' : 'Restablecer Contraseña'}
                    </button>
                </form>

                <div className="mt-6 text-center space-y-2">
                    <p className="text-slate-600">
                        <NavLink to="/login" className="text-secondary font-semibold hover:underline">Regresar al Inicio de Sesión</NavLink>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;
