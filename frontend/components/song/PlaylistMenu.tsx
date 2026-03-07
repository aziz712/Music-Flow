"use client";

import { useState, useRef, useEffect } from "react";
import { Plus, ListMusic, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore } from "@/store/authStore";
import { Song } from "@/types";

interface PlaylistMenuProps {
    song: Song;
    onClose: () => void;
}

export default function PlaylistMenu({ song, onClose }: PlaylistMenuProps) {
    const { isAuthenticated, token } = useAuthStore();
    const [playlists, setPlaylists] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [newPlaylistName, setNewPlaylistName] = useState("");
    const menuRef = useRef<HTMLDivElement>(null);

    const fetchPlaylists = async () => {
        if (!isAuthenticated) return;
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/playlists/my`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            setPlaylists(data);
        } catch (error) {
            console.error("Failed to fetch playlists");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPlaylists();

        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isAuthenticated, token]);

    const addToPlaylist = async (playlistId: string) => {
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/playlists/${playlistId}/songs`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    title: song.title,
                    artist: song.artist.name,
                    link: song.link,
                    cover: song.image || (song.album as any)?.cover_medium || (song.album as any)?.cover || "/icon.png",
                    duration: song.duration
                })
            });
            if (res.ok) {
                // Refresh to show checkmark
                fetchPlaylists();
            }
        } catch (error) {
            console.error("Failed to add to playlist");
        }
    };

    const createPlaylist = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newPlaylistName.trim()) return;

        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/playlists`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    name: newPlaylistName,
                    isPublic: false
                })
            });

            if (res.ok) {
                setNewPlaylistName("");
                setIsCreating(false);
                fetchPlaylists();
            }
        } catch (error) {
            console.error("Failed to create playlist");
        }
    };

    return (
        <motion.div
            ref={menuRef}
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            className="absolute bottom-12 right-0 w-64 bg-card border border-border rounded-xl shadow-2xl z-50 overflow-hidden py-1"
            onClick={(e) => e.stopPropagation()}
        >
            <div className="px-4 py-2 border-b border-border mb-1 flex items-center justify-between">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Add to Playlist</p>
                <button
                    onClick={() => setIsCreating(true)}
                    className="p-1 hover:bg-muted rounded text-primary transition-colors"
                >
                    <Plus className="w-3.5 h-3.5" />
                </button>
            </div>

            <div className="max-h-48 overflow-y-auto">
                {loading ? (
                    <div className="px-4 py-2 text-sm text-muted-foreground">Loading...</div>
                ) : playlists.length > 0 ? (
                    playlists.map((pl) => (
                        <button
                            key={pl._id}
                            onClick={() => addToPlaylist(pl._id)}
                            className="w-full flex items-center justify-between px-4 py-2 text-sm hover:bg-muted transition-colors"
                        >
                            <div className="flex items-center gap-2">
                                <ListMusic className="w-4 h-4 text-primary" />
                                <span className="font-medium truncate max-w-[160px]">{pl.name}</span>
                            </div>
                            {pl.songs.some((s: any) => s.link === song.link) && <Check className="w-4 h-4 text-green-500" />}
                        </button>
                    ))
                ) : !isCreating && (
                    <div className="px-4 py-3 text-center text-xs text-muted-foreground">
                        No playlists found
                    </div>
                )}
            </div>

            {isCreating ? (
                <form onSubmit={createPlaylist} className="p-3 border-t border-border bg-muted/30">
                    <input
                        autoFocus
                        type="text"
                        placeholder="Playlist name..."
                        className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-xs focus:ring-1 focus:ring-primary outline-none"
                        value={newPlaylistName}
                        onChange={(e) => setNewPlaylistName(e.target.value)}
                    />
                    <div className="flex gap-2 mt-2">
                        <button
                            type="submit"
                            className="flex-1 bg-primary text-primary-foreground text-[10px] font-bold py-1.5 rounded-lg hover:opacity-90 transition-opacity"
                        >
                            Create
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsCreating(false)}
                            className="px-3 bg-secondary text-secondary-foreground text-[10px] font-bold py-1.5 rounded-lg hover:bg-secondary/80 transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            ) : (
                <button
                    className="w-full px-4 py-2 text-xs font-bold text-primary hover:bg-muted transition-colors text-left flex items-center gap-2 border-t border-border mt-1"
                    onClick={() => setIsCreating(true)}
                >
                    <Plus className="w-4 h-4" />
                    Create New Playlist
                </button>
            )}
        </motion.div>
    );
}
