"use client";

import { useState } from "react";
import { Song } from "@/types";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, Download, CheckCircle2, Circle, Heart, Plus } from "lucide-react";
import { usePlayerStore } from "@/store/playerStore";
import { useAuthStore } from "@/store/authStore";
import { trackHistory, toggleFavorite } from "@/services/api";
import { Button } from "../ui/Button";
import PlaylistMenu from "./PlaylistMenu";

interface SongCardProps {
    song: Song;
    isSelected?: boolean;
    onToggleSelect?: () => void;
}

export default function SongCard({ song, isSelected, onToggleSelect }: SongCardProps) {
    const { currentSong, isPlaying, togglePlay, setCurrentSong } = usePlayerStore();
    const { isAuthenticated, user, setUser } = useAuthStore();
    const isCurrent = currentSong?.id === song.id;
    const [isDownloading, setIsDownloading] = useState(false);
    const [isResolving, setIsResolving] = useState(false);
    const [isFavorite, setIsFavorite] = useState(user?.favorites?.includes(String(song.id)) || false);
    const [showPlaylistMenu, setShowPlaylistMenu] = useState(false);

    const handlePlay = () => {
        if (isCurrent) {
            togglePlay();
        } else {
            setCurrentSong(song);
            if (isAuthenticated) {
                trackHistory(String(song.id)).catch(console.error);
            }
        }
    };

    const handleFavorite = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!isAuthenticated) return alert("Please login to favorite songs");

        try {
            const newFavorites = await toggleFavorite(String(song.id));
            setIsFavorite(newFavorites.includes(String(song.id)));
            if (user) {
                setUser({ ...user, favorites: newFavorites });
            }
        } catch (error) {
            console.error("Failed to toggle favorite");
        }
    };

    const handlePlusClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!isAuthenticated) return alert("Please login to manage playlists");
        setShowPlaylistMenu(!showPlaylistMenu);
    };

    const handleDownload = async (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsDownloading(true);
        try {
            const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/songs/download?url=${encodeURIComponent(song.link)}&title=${encodeURIComponent(song.title)}&artist=${encodeURIComponent(song.artist.name)}`;
            const response = await fetch(url);
            if (!response.ok) throw new Error("Download failed");

            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = downloadUrl;
            a.download = `${song.artist.name} - ${song.title}.mp3`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(downloadUrl);
        } catch (error) {
            alert("Failed to download song. Please try again.");
            console.error(error);
        } finally {
            setIsDownloading(false);
        }
    };

    const handleWatch = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (typeof song.id === 'string') {
            usePlayerStore.getState().openVideo(song.id);
            return;
        }

        setIsResolving(true);
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/songs/resolve?title=${encodeURIComponent(song.title)}&artist=${encodeURIComponent(song.artist.name)}`);
            const data = await res.json();
            if (data.videoId) {
                usePlayerStore.getState().openVideo(data.videoId);
            } else {
                alert("Could not find video for this song.");
            }
        } catch (error) {
            console.error("Failed to resolve video:", error);
            alert("Error finding video.");
        } finally {
            setIsResolving(false);
        }
    };

    return (
        <motion.div
            whileHover={{ y: -8, scale: 1.02 }}
            className={`group relative bg-card/40 backdrop-blur-xl rounded-2xl p-4 shadow-[0_8px_30px_rgb(0,0,0,0.12)] border transition-all duration-500 ${isSelected ? 'border-primary ring-2 ring-primary/20 bg-primary/5' : 'border-border/30 hover:border-primary/50 hover:shadow-primary/10'}`}
        >
            {/* Selection Checkbox */}
            {onToggleSelect && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onToggleSelect();
                    }}
                    className={`absolute top-2 right-2 z-30 p-1 rounded-full transition-all ${isSelected ? 'opacity-100 text-primary' : 'opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-primary'}`}
                >
                    {isSelected ? (
                        <CheckCircle2 className="w-6 h-6 fill-primary/10" />
                    ) : (
                        <Circle className="w-6 h-6" />
                    )}
                </button>
            )}

            <div className="relative aspect-square rounded-lg overflow-hidden mb-4">
                <img
                    src={song.image || (song.album as any)?.cover_medium || (song.album as any)?.cover || "/icon.png"}
                    alt={song.title}
                    className="object-cover w-full h-full transition-transform duration-700 group-hover:scale-110"
                    onError={(e) => {
                        (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&q=80";
                    }}
                />
                {/* Play Overlay */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                    <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={handleFavorite}
                        className={`p-2 rounded-full backdrop-blur-md border ${isFavorite ? 'bg-red-500 border-red-500 text-white' : 'bg-white/20 border-white/30 text-white'}`}
                    >
                        <Heart className={`w-5 h-5 ${isFavorite ? 'fill-current' : ''}`} />
                    </motion.button>

                    <Button
                        variant="default"
                        className="rounded-full w-14 h-14 p-0 shadow-xl"
                        onClick={handlePlay}
                    >
                        {isCurrent && isPlaying ? <Pause className="w-7 h-7" /> : <Play className="w-7 h-7 ml-1" />}
                    </Button>

                    <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={handlePlusClick}
                        className={`p-2 rounded-full backdrop-blur-md border border-white/30 text-white ${showPlaylistMenu ? 'bg-primary border-primary' : 'bg-white/20'}`}
                    >
                        <Plus className="w-5 h-5" />
                    </motion.button>
                </div>

                <AnimatePresence>
                    {showPlaylistMenu && (
                        <PlaylistMenu
                            song={song}
                            onClose={() => setShowPlaylistMenu(false)}
                        />
                    )}
                </AnimatePresence>
            </div>

            <div className="space-y-1">
                <h3 className="font-semibold truncate text-foreground">{song.title}</h3>
                <p className="text-sm text-muted-foreground truncate">{song.artist.name}</p>

                <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/20">
                    <span className="text-[10px] font-medium text-muted-foreground/70 bg-muted/50 px-2 py-0.5 rounded-full">
                        {new Date(song.duration * 1000).toISOString().substr(14, 5)}
                    </span>

                    <button
                        onClick={handleWatch}
                        disabled={isResolving}
                        className="text-xs text-red-500 hover:text-red-400 flex items-center gap-1 z-20 font-medium disabled:opacity-50"
                    >
                        <Play className="w-3 h-3 fill-current" />
                        {isResolving ? '...' : 'Watch'}
                    </button>

                    <button
                        onClick={handleDownload}
                        disabled={isDownloading}
                        className="text-xs text-primary hover:underline flex items-center gap-1 z-20 disabled:opacity-50"
                    >
                        {isDownloading ? (
                            <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <Download className="w-3 h-3" />
                        )}
                        {isDownloading ? '...' : 'Download'}
                    </button>
                    {/* <span className="text-[10px] text-muted-foreground/50 border border-border px-1 rounded ml-2">Preview</span> */}
                </div>
            </div>
        </motion.div>
    );
}
