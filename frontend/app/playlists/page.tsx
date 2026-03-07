"use client";

import { useEffect, useState } from "react";
import { getUserPlaylists, createPlaylist, deletePlaylist } from "@/services/api";
import { ListMusic, Plus, Play, Trash2, Disc, Music, X, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useAuthStore } from "@/store/authStore";

export default function PlaylistsPage() {
    const [playlists, setPlaylists] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [newPlaylistName, setNewPlaylistName] = useState("");
    const { isAuthenticated } = useAuthStore();

    const fetchPlaylists = async () => {
        if (!isAuthenticated) return;
        try {
            const data = await getUserPlaylists();
            setPlaylists(data);
        } catch (error) {
            console.error("Failed to fetch playlists", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPlaylists();
    }, [isAuthenticated]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newPlaylistName.trim()) return;

        try {
            await createPlaylist({ name: newPlaylistName });
            setNewPlaylistName("");
            setIsCreating(false);
            fetchPlaylists();
        } catch (error) {
            console.error("Failed to create playlist", error);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (confirm(`Are you sure you want to delete the playlist "${name}"?`)) {
            try {
                await deletePlaylist(id);
                fetchPlaylists();
            } catch (error) {
                console.error("Failed to delete playlist", error);
            }
        }
    };

    if (!isAuthenticated) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
                <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-6">
                    <ListMusic className="w-10 h-10 text-muted-foreground" />
                </div>
                <h1 className="text-3xl font-bold mb-2">Login to see your playlists</h1>
                <p className="text-muted-foreground mb-8">Save and organize your favorite tracks into custom collections.</p>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="container max-w-screen-xl mx-auto p-8 pb-32">
                <div className="h-10 w-48 bg-muted animate-pulse rounded-lg mb-12" />
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="space-y-4">
                            <div className="aspect-square bg-muted animate-pulse rounded-2xl" />
                            <div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="container max-w-screen-xl mx-auto p-8 pb-32">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
                <div>
                    <h1 className="text-4xl md:text-5xl font-black tracking-tight">My Playlists</h1>
                    <p className="text-muted-foreground mt-2 text-lg">Your personal collections and curated mixes.</p>
                </div>

                <AnimatePresence mode="wait">
                    {!isCreating ? (
                        <motion.div
                            key="add-btn"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                        >
                            <Button
                                onClick={() => setIsCreating(true)}
                                className="rounded-full h-12 px-8 gap-2 shadow-xl hover:scale-105 transition-all bg-primary text-white"
                            >
                                <Plus className="w-5 h-5" />
                                <span className="font-bold">Create New</span>
                            </Button>
                        </motion.div>
                    ) : (
                        <motion.form
                            key="create-form"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            onSubmit={handleCreate}
                            className="flex items-center gap-2 bg-card border border-border p-1 rounded-full pl-6 pr-1 shadow-2xl w-full max-w-md"
                        >
                            <input
                                autoFocus
                                type="text"
                                placeholder="Name your playlist..."
                                className="bg-transparent flex-1 outline-none text-sm font-bold h-10"
                                value={newPlaylistName}
                                onChange={(e) => setNewPlaylistName(e.target.value)}
                            />
                            <div className="flex items-center gap-1">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-10 w-10 rounded-full hover:bg-muted"
                                    onClick={() => {
                                        setIsCreating(false);
                                        setNewPlaylistName("");
                                    }}
                                >
                                    <X className="w-4 h-4" />
                                </Button>
                                <Button
                                    type="submit"
                                    className="h-10 px-4 rounded-full gap-2 font-bold"
                                    disabled={!newPlaylistName.trim()}
                                >
                                    <Check className="w-4 h-4" />
                                    <span>Create</span>
                                </Button>
                            </div>
                        </motion.form>
                    )}
                </AnimatePresence>
            </div>

            {playlists.length === 0 && !isCreating ? (
                <div className="bg-muted/30 border-2 border-dashed border-border rounded-3xl p-16 text-center">
                    <Disc className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                    <h2 className="text-xl font-bold">No playlists yet</h2>
                    <p className="text-muted-foreground mb-6">Start adding songs to create your first collection.</p>
                    <Link href="/">
                        <Button variant="outline" className="rounded-full px-8">Explore Songs</Button>
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8">
                    {playlists.map((playlist, index) => (
                        <motion.div
                            key={playlist._id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="group relative"
                        >
                            <button
                                onClick={(e) => {
                                    e.preventDefault();
                                    handleDelete(playlist._id, playlist.name);
                                }}
                                className="absolute -top-2 -right-2 z-20 w-8 h-8 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110 active:scale-95"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>

                            <Link href={`/playlists/${playlist._id}`} className="block">
                                <div className="relative aspect-square rounded-2xl overflow-hidden shadow-xl mb-4 bg-muted border border-border/50">
                                    {playlist.songs?.[0]?.cover ? (
                                        <img
                                            src={playlist.songs[0].cover}
                                            alt={playlist.name}
                                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
                                            <Music className="w-12 h-12 text-muted-foreground/30" />
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                                        <div className="w-14 h-14 bg-primary rounded-full flex items-center justify-center shadow-2xl translate-y-4 group-hover:translate-y-0 transition-all duration-300">
                                            <Play className="w-6 h-6 fill-current text-white ml-1" />
                                        </div>
                                    </div>

                                    <div className="absolute bottom-3 left-3 bg-black/20 backdrop-blur-md px-2 py-1 rounded-lg text-[10px] font-bold text-white border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {playlist.songs?.length || 0} TRACKS
                                    </div>
                                </div>
                                <h3 className="font-bold text-lg truncate group-hover:text-primary transition-colors pr-8">{playlist.name}</h3>
                                <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mt-0.5">{playlist.isPublic ? 'Public' : 'Private'}</p>
                            </Link>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
}
