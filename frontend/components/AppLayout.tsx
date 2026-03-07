"use client";

import Link from "next/link";
import { Search, ListMusic } from "lucide-react";
import { Button } from "./ui/Button";
import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import UserDropdown from "./UserDropdown";
import { useAuthStore } from "@/store/authStore";

// Dynamic imports for heavy components to improve initial load
const MusicPlayer = dynamic(() => import("./player/MusicPlayer"), { ssr: false });
const AuthModal = dynamic(() => import("./AuthModal"), { ssr: false });

export default function AppLayout({ children }: { children: React.ReactNode }) {
    const [isDark, setIsDark] = useState(false);
    const [isHydrated, setIsHydrated] = useState(false);
    const { isAuthModalOpen, setAuthModalOpen, authMode } = useAuthStore();

    useEffect(() => {
        setIsHydrated(true);

        if (typeof window !== 'undefined') {
            const isDarkMode = document.documentElement.classList.contains('dark');
            setIsDark(isDarkMode);

            // Handle ChunkLoadError (common during deployments)
            const handleError = (e: ErrorEvent) => {
                if (e.message?.includes('Loading chunk') || e.message?.includes('ChunkLoadError')) {
                    console.warn('Chunk load failure detected, reloading page...');
                    window.location.reload();
                }
            };

            window.addEventListener('error', handleError);

            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.register('/sw.js').catch(err => {
                    console.error('Service worker registration failed:', err);
                });
            }

            return () => window.removeEventListener('error', handleError);
        }
    }, []);

    const toggleTheme = () => {
        const newMode = !isDark;
        setIsDark(newMode);
        document.documentElement.classList.toggle('dark', newMode);
    };

    if (!isHydrated) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col">
            <nav className="border-b border-border/40 backdrop-blur-md fixed top-0 w-full z-[100] bg-background/80">
                <div className="container max-w-screen-xl mx-auto flex h-16 items-center justify-between px-4">
                    <Link href="/" className="flex items-center gap-2 sm:gap-3 group">
                        <img
                            src="/logo.png?v=2"
                            alt="Music Flow Logo"
                            width={40}
                            height={40}
                            className="h-10 w-auto transition-transform group-hover:scale-105 filter drop-shadow-sm"
                            loading="eager"
                        />
                        <span className="font-black text-lg sm:text-2xl tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-400">
                            Music Flow
                        </span>
                    </Link>

                    <div className="flex items-center gap-4">
                        <Link href="/search">
                            <Button variant="ghost" className="gap-2">
                                <Search className="w-4 h-4" />
                                <span className="hidden sm:inline">Search</span>
                            </Button>
                        </Link>
                        <Link href="/bulk">
                            <Button variant="ghost" className="gap-2">
                                <ListMusic className="w-4 h-4" />
                                <span className="hidden sm:inline">Bulk</span>
                            </Button>
                        </Link>

                        <UserDropdown />

                        <Button variant="outline" size="icon" onClick={toggleTheme} className="rounded-full">
                            {isDark ? '☀️' : '🌙'}
                        </Button>
                    </div>
                </div>
            </nav>

            <main className="flex-1 pt-20 pb-24 px-4 container max-w-screen-xl mx-auto">
                {children}
            </main>

            <MusicPlayer />

            {isAuthModalOpen && (
                <AuthModal
                    isOpen={isAuthModalOpen}
                    onClose={() => setAuthModalOpen(false)}
                    mode={authMode}
                />
            )}
        </div>
    );
}
