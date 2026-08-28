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

    async function login(email, password) {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });
        if (error) throw error;
        return data;
    }

    async function signup(email, password, fullName = '') {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName,
                    role: 'user'
                }
            }
        });
        if (error) throw error;
        return data;
    }

    async function loginWithGoogle() {
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google'
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

    async function fetchUserProfile(userId) {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();
            if (data && !error) {
                setUserData(data);
            } else {
                setUserData({ role: 'user' });
            }
        } catch (err) {
            console.error('Error al obtener perfil:', err);
            setUserData({ role: 'user' });
        }
    }

    useEffect(() => {
        // Obtenemos la sesión actual al montar
        supabase.auth.getSession().then(({ data: { session } }) => {
            const user = session?.user ?? null;
            setCurrentUser(user);
            if (user) {
                fetchUserProfile(user.id);
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
                fetchUserProfile(user.id);
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
