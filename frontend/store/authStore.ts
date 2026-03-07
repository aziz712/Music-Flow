import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '@/types';

interface AuthState {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    isAuthModalOpen: boolean;
    authMode: 'login' | 'register';
    setUser: (user: User | null) => void;
    setToken: (token: string | null) => void;
    setAuthModalOpen: (open: boolean, mode?: 'login' | 'register') => void;
    logout: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            token: null,
            isAuthenticated: false,
            isAuthModalOpen: false,
            authMode: 'login',
            setUser: (user) => set({ user, isAuthenticated: !!user }),
            setToken: (token) => {
                set({ token });
                if (typeof window !== "undefined") {
                    if (token) {
                        document.cookie = `auth-token=${token}; path=/; max-age=${30 * 24 * 60 * 60}; samesite=lax`;
                    } else {
                        document.cookie = "auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
                    }
                }
            },
            setAuthModalOpen: (open, mode = 'login') => set({ isAuthModalOpen: open, authMode: mode }),
            logout: () => {
                set({ user: null, token: null, isAuthenticated: false });
                if (typeof window !== "undefined") {
                    document.cookie = "auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
                }
            },
        }),
        {
            name: 'auth-storage',
        }
    )
);
