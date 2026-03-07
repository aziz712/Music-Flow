"use client";

import { useEffect, useState } from "react";
import { getFavoriteSongs } from "@/services/api";
import { Heart, Play, Music, ArrowLeft, Loader2, Sparkles } from "lucide-react";
import { Song } from "@/types";
import { Button } from "@/components/ui/Button";
import SongCard from "@/components/song/SongCard";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useAuthStore } from "@/store/authStore";
import { usePlayerStore } from "@/store/playerStore";

export default function FavoritesPage() {
    const { playPlaylist } = usePlayerStore();
    const [songs, setSongs] = useState<Song[]>([]);
    const [loading, setLoading] = useState(true);
    const { isAuthenticated } = useAuthStore();

    useEffect(() => {
        if (isAuthenticated) {
            getFavoriteSongs()
                .then(setSongs)
                .catch(console.error)
                .finally(() => setLoading(false));
        }
    }, [isAuthenticated]);

    if (!isAuthenticated) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
                <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-6">
                    <Heart className="w-10 h-10 text-muted-foreground" />
                </div>
                <h1 className="text-3xl font-bold mb-2">Login to see your favorites</h1>
                <p className="text-muted-foreground mb-8">Save songs you love to access them instantly.</p>
            </div>
        );
    }

    return (
        <div className="container max-w-screen-xl mx-auto p-4 md:p-8 pb-32">
            <div className="flex flex-col md:flex-row items-center justify-between mb-12 gap-6">
                <div className="flex items-center gap-6">
                    <Link href="/profile">
                        <Button variant="ghost" size="icon" className="rounded-full hover:bg-primary/10 transition-colors h-12 w-12">
                            <ArrowLeft className="w-6 h-6" />
                        </Button>
                    </Link>
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <h1 className="text-4xl md:text-5xl font-black tracking-tight">Liked Songs</h1>
                            <Sparkles className="w-6 h-6 text-primary animate-pulse" />
                        </div>
                        <p className="text-muted-foreground font-medium text-lg">{songs.length} Tracks in your collection</p>
                    </div>
                </div>

                <Button
                    onClick={() => playPlaylist(songs)}
                    className="rounded-full h-14 px-8 gap-3 shadow-2xl hover:scale-105 transition-transform bg-primary text-primary-foreground font-bold text-lg"
                >
                    <Play className="w-6 h-6 fill-current" />
                    <span>Play All ({songs.length})</span>
                </Button>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-32 space-y-4">
                    <Loader2 className="w-12 h-12 text-primary animate-spin" />
                    <p className="text-muted-foreground font-medium animate-pulse">Syncing your library...</p>
                </div>
            ) : songs.length === 0 ? (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-card/30 border-2 border-dashed border-border rounded-[2.5rem] p-16 md:p-32 text-center backdrop-blur-sm"
                >
                    <div className="w-24 h-24 bg-red-500/10 rounded-3xl flex items-center justify-center mx-auto mb-8">
                        <Heart className="w-12 h-12 text-red-500/50" />
                    </div>
                    <h2 className="text-3xl font-bold mb-3">Your library is empty</h2>
                    <p className="text-muted-foreground mb-8 text-lg max-w-md mx-auto">Found a track you love? Click the heart icon on any song to save it here.</p>
                    <Link href="/">
                        <Button variant="default" className="rounded-full px-10 h-14 font-bold">Discover New Music</Button>
                    </Link>
                </motion.div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 md:gap-8">
                    <AnimatePresence mode="popLayout">
                        {songs.map((song, index) => (
                            <motion.div
                                key={song.id}
                                layout
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                transition={{ delay: index * 0.05 }}
                            >
                                <SongCard song={song} />
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
}
