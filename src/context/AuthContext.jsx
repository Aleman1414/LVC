import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext();

export function useAuth() {
    return useContext(AuthContext);
}

export const SUPERADMIN_EMAIL = 'angel.aleman1414@gmail.com';
export const ADMIN_EMAILS = [SUPERADMIN_EMAIL, 'angel.alema1414@gmail.com', 'admin@lvc.com'];

export function AuthProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(null);
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);

    const isSuperAdminEmail = (email) => (email || '').toLowerCase().trim() === SUPERADMIN_EMAIL;
    const isAdminEmail = (email) => {
        const normalized = (email || '').toLowerCase().trim();
        return isSuperAdminEmail(normalized) || ADMIN_EMAILS.includes(normalized);
    };

    const normalizeRole = (role, email) => {
        if (isSuperAdminEmail(email)) return 'admin';
        if (isAdminEmail(email)) return 'admin';
        if (role === 'admin') return 'admin';
        if (role === 'delegado' || role === 'user') return 'delegado';
        if (role === 'pending') return 'pending';
        return 'pending'; // por defecto cuentas sin rol quedan pendientes de autorización
    };

    const fetchUserProfile = useCallback(async (user) => {
        if (!user) {
            setUserData(null);
            return null;
        }

        const normalizedEmail = (user.email || '').toLowerCase().trim();
        const superUser = isSuperAdminEmail(normalizedEmail);
        const adminEmail = isAdminEmail(normalizedEmail);

        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .maybeSingle();

            if (data && !error) {
                const finalRole = normalizeRole(data.role, normalizedEmail);
                const profileObj = {
                    ...data,
                    role: finalRole,
                    isSuperAdmin: superUser
                };
                setUserData(profileObj);

                // Si es superusuario o admin por lista pero en BD no estaba como admin, sincronizar
                if ((superUser || adminEmail) && data.role !== 'admin') {
                    await supabase.from('profiles').update({ role: 'admin' }).eq('id', user.id);
                }
                return profileObj;
            } else {
                // Si aún no tiene perfil en profiles, crearlo
                const finalRole = superUser || adminEmail ? 'admin' : 'pending';
                const newProfile = {
                    id: user.id,
                    email: user.email,
                    full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || user.email,
                    role: finalRole
                };
                setUserData({ ...newProfile, isSuperAdmin: superUser });

                await supabase.from('profiles').upsert(newProfile);
                return { ...newProfile, isSuperAdmin: superUser };
            }
        } catch (err) {
            console.error('Error al obtener perfil:', err);
            const fallbackRole = superUser || adminEmail ? 'admin' : 'pending';
            const fallbackObj = {
                id: user.id,
                email: user.email,
                full_name: user.email,
                role: fallbackRole,
                isSuperAdmin: superUser
            };
            setUserData(fallbackObj);
            return fallbackObj;
        }
    }, []);

    const refreshProfile = useCallback(async () => {
        if (currentUser) {
            return await fetchUserProfile(currentUser);
        }
        return null;
    }, [currentUser, fetchUserProfile]);

    async function login(email, password) {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password
        });
        if (error) throw error;
        if (data?.user) {
            await fetchUserProfile(data.user);
        }
        return data;
    }

    async function signup(email, password, fullName = '', initialRole = null) {
        const normalizedEmail = email.toLowerCase().trim();
        const superUser = isSuperAdminEmail(normalizedEmail);
        const adminEmail = isAdminEmail(normalizedEmail);
        const role = initialRole || (superUser || adminEmail ? 'admin' : 'pending');

        const { data, error } = await supabase.auth.signUp({
            email: normalizedEmail,
            password,
            options: {
                data: {
                    full_name: fullName,
                    role
                }
            }
        });
        if (error) throw error;

        if (data?.user) {
            await supabase.from('profiles').upsert({
                id: data.user.id,
                email: normalizedEmail,
                full_name: fullName || normalizedEmail.split('@')[0],
                role
            });
            await fetchUserProfile(data.user);
        }
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
        setCurrentUser(null);
        setUserData(null);
        if (error) throw error;
    }

    async function resetPassword(email) {
        const { data, error } = await supabase.auth.resetPasswordForEmail(email.trim());
        if (error) throw error;
        return data;
    }

    useEffect(() => {
        let mounted = true;

        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!mounted) return;
            const user = session?.user ?? null;
            setCurrentUser(user);
            if (user) {
                fetchUserProfile(user).finally(() => {
                    if (mounted) setLoading(false);
                });
            } else {
                setUserData(null);
                setLoading(false);
            }
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (!mounted) return;
            const user = session?.user ?? null;
            setCurrentUser(user);
            if (user) {
                fetchUserProfile(user).finally(() => {
                    if (mounted) setLoading(false);
                });
            } else {
                setUserData(null);
                setLoading(false);
            }
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, [fetchUserProfile]);

    // Escuchar cambios en tiempo real en la tabla de perfiles para actualizar el rol al instante
    useEffect(() => {
        if (!currentUser?.id) return;

        const channel = supabase
            .channel(`profile_changes_${currentUser.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'profiles',
                    filter: `id=eq.${currentUser.id}`
                },
                (payload) => {
                    if (payload.new) {
                        const updatedRole = normalizeRole(payload.new.role, currentUser.email);
                        setUserData((prev) => ({
                            ...(prev || {}),
                            ...payload.new,
                            role: updatedRole,
                            isSuperAdmin: isSuperAdminEmail(currentUser.email)
                        }));
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [currentUser?.id, currentUser?.email]);

    const isSuperAdmin = isSuperAdminEmail(currentUser?.email);
    const isAdmin = isSuperAdmin || userData?.role === 'admin';
    const isDelegate = userData?.role === 'delegado';
    const isPending = userData?.role === 'pending' && !isAdmin;
    const canEdit = isAdmin; // Administradores y Super Usuario pueden editar; delegados solo observan

    const value = {
        currentUser,
        userData,
        loading,
        isSuperAdmin,
        isAdmin,
        isDelegate,
        isPending,
        canEdit,
        login,
        signup,
        loginWithGoogle,
        logout,
        resetPassword,
        refreshProfile
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
}

