import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext();

export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(null);
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);

    const ADMIN_EMAILS = ['angel.alema1414@gmail.com'];

    async function login(email, password) {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });
        if (error) throw error;
        return data;
    }

    async function signup(email, password, fullName = '') {
        const isAdmin = ADMIN_EMAILS.includes(email.toLowerCase());
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName,
                    role: isAdmin ? 'admin' : 'user'
                }
            }
        });
        if (error) throw error;
        return data;
    }

    async function loginWithGoogle() {
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}`
            }
        });
        if (error) throw error;
        return data;
    }

    async function logout() {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
    }

    async function resetPassword(email) {
        const { data, error } = await supabase.auth.resetPasswordForEmail(email);
        if (error) throw error;
        return data;
    }

    async function fetchUserProfile(user) {
        if (!user) {
            setUserData(null);
            return;
        }

        const isAdminEmail = ADMIN_EMAILS.includes((user.email || '').toLowerCase());

        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (data && !error) {
                const role = isAdminEmail ? 'admin' : (data.role || 'user');
                setUserData({ ...data, role });

                // Asegurar que en Supabase la columna role este en admin si es el mail admin
                if (isAdminEmail && data.role !== 'admin') {
                    await supabase.from('profiles').update({ role: 'admin' }).eq('id', user.id);
                }
            } else {
                const role = isAdminEmail ? 'admin' : 'user';
                setUserData({ role, email: user.email, full_name: user.user_metadata?.full_name || user.email });

                // Upsert perfil inicial
                await supabase.from('profiles').upsert({
                    id: user.id,
                    email: user.email,
                    full_name: user.user_metadata?.full_name || user.email,
                    role
                });
            }
        } catch (err) {
            console.error('Error al obtener perfil:', err);
            const role = isAdminEmail ? 'admin' : 'user';
            setUserData({ role, email: user.email });
        }
    }

    useEffect(() => {
        // Obtenemos la sesión actual al montar
        supabase.auth.getSession().then(({ data: { session } }) => {
            const user = session?.user ?? null;
            setCurrentUser(user);
            if (user) {
                fetchUserProfile(user);
            } else {
                setUserData(null);
            }
            setLoading(false);
        });

        // Escuchamos cambios de estado de autenticación
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            const user = session?.user ?? null;
            setCurrentUser(user);
            if (user) {
                fetchUserProfile(user);
            } else {
                setUserData(null);
            }
            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    const value = {
        currentUser,
        userData,
        login,
        signup,
        loginWithGoogle,
        logout,
        resetPassword
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
}
