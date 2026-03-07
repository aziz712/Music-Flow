"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/Button";
import { User, Settings, Heart, ListMusic, ChevronRight, Sparkles, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { getUserPlaylists } from "@/services/api";

export default function ProfilePage() {
    const { user, isAuthenticated } = useAuthStore();
    const [playlistCount, setPlaylistCount] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isAuthenticated) {
            getUserPlaylists()
                .then(playlists => setPlaylistCount(playlists.length))
                .catch(console.error)
                .finally(() => setLoading(false));
        }
    }, [isAuthenticated]);

    if (!isAuthenticated) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
                <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-6">
                    <User className="w-10 h-10 text-muted-foreground" />
                </div>
                <h1 className="text-3xl font-bold mb-2">Login to see your profile</h1>
                <p className="text-muted-foreground mb-8">Access your favorites, playlists, and personalized settings.</p>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-12 pb-32">
            {/* Header Section */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative overflow-hidden p-8 bg-card/40 backdrop-blur-xl rounded-3xl border border-border/50 shadow-2xl"
            >
                <div className="absolute top-0 right-0 p-8 opacity-10">
                    <Sparkles className="w-32 h-32" />
                </div>

                <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
                    <div className="relative">
                        <div className="h-32 w-32 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center shadow-2xl ring-4 ring-background">
                            <User className="h-16 w-16 text-white" />
                        </div>
                        <div className="absolute -bottom-2 -right-2 bg-green-500 h-8 w-8 rounded-full border-4 border-background flex items-center justify-center shadow-lg" title="Active Account">
                            <ShieldCheck className="w-4 h-4 text-white" />
                        </div>
                    </div>

                    <div className="text-center md:text-left space-y-2">
                        <h1 className="text-4xl md:text-5xl font-black tracking-tight">{user?.name || "Member"}</h1>
                        <p className="text-muted-foreground flex items-center justify-center md:justify-start gap-2">
                            <span className="bg-primary/20 text-primary text-xs font-bold px-3 py-1 rounded-full uppercase tracking-widest">
                                Premium Plan
                            </span>
                            <span className="text-sm">• Account verified</span>
                        </p>
                    </div>

                    <div className="md:ml-auto">
                        <Link href="/settings">
                            <Button variant="outline" className="gap-2 h-12 px-6 rounded-full border-border/50 bg-background/50 backdrop-blur-md hover:bg-primary/10 hover:border-primary/50 transition-all shadow-lg active:scale-95">
                                <Settings className="w-4 h-4" />
                                <span>Account Settings</span>
                            </Button>
                        </Link>
                    </div>
                </div>
            </motion.div>

            {/* Quick Links Grid */}
            <div className="grid md:grid-cols-2 gap-8">
                <Link href="/favorites">
                    <motion.div
                        whileHover={{ y: -8, scale: 1.02 }}
                        className="p-8 bg-card/40 backdrop-blur-xl rounded-3xl border border-border/50 hover:border-red-500/50 transition-all cursor-pointer group shadow-xl"
                    >
                        <div className="flex items-center justify-between mb-8">
                            <div className="p-4 bg-red-500/10 rounded-2xl text-red-500 group-hover:bg-red-500 group-hover:text-white transition-all duration-500 shadow-inner">
                                <Heart className="w-8 h-8 fill-current" />
                            </div>
                            <ChevronRight className="w-6 h-6 text-muted-foreground group-hover:text-red-500 transition-colors" />
                        </div>
                        <h2 className="text-2xl font-black mb-2">Liked Songs</h2>
                        <p className="text-muted-foreground font-medium">{user?.favorites?.length || 0} tracks in your library</p>
                    </motion.div>
                </Link>

                <Link href="/playlists">
                    <motion.div
                        whileHover={{ y: -8, scale: 1.02 }}
                        className="p-8 bg-card/40 backdrop-blur-xl rounded-3xl border border-border/50 hover:border-blue-500/50 transition-all cursor-pointer group shadow-xl"
                    >
                        <div className="flex items-center justify-between mb-8">
                            <div className="p-4 bg-blue-500/10 rounded-2xl text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-all duration-500 shadow-inner">
                                <ListMusic className="w-8 h-8" />
                            </div>
                            <ChevronRight className="w-6 h-6 text-muted-foreground group-hover:text-blue-500 transition-colors" />
                        </div>
                        <h2 className="text-2xl font-black mb-2">My Playlists</h2>
                        <p className="text-muted-foreground font-medium">{playlistCount} collections created</p>
                    </motion.div>
                </Link>
            </div>

            {/* Account Info Footer */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="p-8 bg-primary/10 rounded-3xl border border-primary/20 backdrop-blur-sm relative overflow-hidden"
            >
                <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent pointer-events-none" />
                <h2 className="text-lg font-black mb-2 flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-primary" />
                    Security Note
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
                    Your profile and listening data are encrypted and stored securely in our private cloud database.
                    You have full control over your data in the transparency settings.
                </p>
            </motion.div>
        </div>
    );
}
