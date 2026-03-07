"use client";

import { useEffect, useRef, useState } from "react";
import { usePlayerStore } from "@/store/playerStore";
import { useAuthStore } from "@/store/authStore";
import { Play, Pause, SkipBack, SkipForward, Volume2, Heart, ListPlus, ListMusic } from "lucide-react";
import { Button } from "../ui/Button";
import { motion, AnimatePresence } from "framer-motion";
import PlaylistMenu from "../song/PlaylistMenu";
import { trackInteraction, toggleFavorite } from "@/services/api";

export default function MusicPlayer() {
    const { currentSong, isPlaying, togglePlay, volume, setVolume } = usePlayerStore();
    const { user, setUser } = useAuthStore();
    const audioRef = useRef<HTMLAudioElement>(null);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [showPlaylistMenu, setShowPlaylistMenu] = useState(false);
    const lastTrackedSongId = useRef<string | null>(null);
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        // Force browser to fetch the new src URL
        audio.load();

        if (isPlaying) {
            const attemptPlay = () => {
                const playPromise = audio.play();
                if (playPromise !== undefined) {
                    playPromise.catch(e => console.error("Playback block:", e));
                }
            };
            // Slight delay lets browser process load() before trying to play
            setTimeout(attemptPlay, 50);
        }
    }, [currentSong]);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        if (isPlaying) {
            if (audio.paused && audio.readyState >= 2) {
                audio.play().catch(e => console.error("Playback failed", e));
            }
        } else {
            audio.pause();
        }
    }, [isPlaying]);


    useEffect(() => {
        if (currentSong && isPlaying && lastTrackedSongId.current !== String(currentSong.id)) {
            lastTrackedSongId.current = String(currentSong.id);
            trackInteraction({
                songId: String(currentSong.id),
                action: 'play',
                metadata: {
                    title: currentSong.title,
                    artist: currentSong.artist.name
                }
            }).catch(console.error);
        }
    }, [currentSong, isPlaying]);

    useEffect(() => {
        if (currentSong) {
            setDuration(currentSong.duration || 0);
            setCurrentTime(0);
        }
    }, [currentSong]);

    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.volume = volume;
        }
    }, [volume]);

    const handleTimeUpdate = () => {
        if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime);
        }
    };

    const handleLoadedMetadata = () => {
        if (audioRef.current) {
            const audioDuration = audioRef.current.duration;
            if (isFinite(audioDuration) && audioDuration > 0) {
                setDuration(audioDuration);
            }
        }
    };

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const time = parseFloat(e.target.value);
        if (audioRef.current) {
            audioRef.current.currentTime = time;
            setCurrentTime(time);
        }
    };

    const formatTime = (time: number) => {
        if (!isFinite(time) || isNaN(time)) return "0:00";
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    const handleToggleFavorite = async () => {
        if (!user || !currentSong) return;
        const songId = String(currentSong.id);
        const isFavourited = user.favorites?.includes(songId);

        try {
            const newFavorites = await toggleFavorite(songId);
            setUser({ ...user, favorites: newFavorites });

            if (!isFavourited) {
                trackInteraction({
                    songId,
                    action: 'like',
                    metadata: { title: currentSong.title, artist: currentSong.artist.name }
                }).catch(console.error);
            }
        } catch (error) {
            console.error("Favorite toggle failed", error);
        }
    };

    if (!currentSong) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ y: 100 }}
                animate={{ y: 0 }}
                exit={{ y: 100 }}
                className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-3xl border-t border-white/5 p-4 z-50 flex flex-col gap-2 shadow-[0_-20px_50px_rgba(0,0,0,0.5)]"
            >
                {/* Progress Control */}
                <div className="container max-w-screen-xl mx-auto flex items-center gap-4 text-[10px] font-black text-muted-foreground/60 w-full mb-1">
                    <span className="w-12 text-right tabular-nums">{formatTime(currentTime)}</span>
                    <div className="flex-1 relative group h-4 flex items-center">
                        {/* Custom Track Background */}
                        <div className="absolute inset-0 h-1.5 my-auto bg-white/5 rounded-full overflow-hidden">
                            <motion.div
                                className="h-full bg-gradient-to-r from-primary to-primary/60"
                                style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
                            />
                        </div>

                        {/* The Actual Input Range - Invisible but larger hit area */}
                        <input
                            type="range"
                            min="0"
                            max={duration || 100}
                            value={currentTime}
                            onChange={handleSeek}
                            className="absolute inset-x-0 inset-y-[-10px] w-full h-full opacity-0 cursor-pointer z-30"
                        />

                        {/* Floating Thumb - only visible on hover or dragging */}
                        <motion.div
                            className="absolute h-4 w-4 bg-white rounded-full shadow-2xl border-2 border-primary z-20 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"
                            style={{ left: `calc(${(currentTime / (duration || 1)) * 100}% - 8px)` }}
                        />
                    </div>
                    <span className="w-12 tabular-nums">{formatTime(duration)}</span>
                </div>

                <div className="container max-w-screen-xl mx-auto flex items-center justify-between gap-6">
                    <div className="flex items-center gap-4 min-w-0 flex-1 sm:max-w-[30%]">
                        <motion.img
                            whileHover={{ scale: 1.05 }}
                            src={currentSong.image || (currentSong.album as any)?.cover_small || (currentSong.album as any)?.cover_medium || "/icon.png"}
                            alt="Cover"
                            className="h-12 w-12 rounded-xl shadow-2xl flex-shrink-0 object-cover ring-1 ring-white/10"
                        />
                        <div className="min-w-0">
                            <p className="font-black text-sm truncate leading-tight">{currentSong.title}</p>
                            <p className="text-[11px] text-muted-foreground truncate font-bold mt-1">{currentSong.artist?.name || 'Unknown Artist'}</p>
                        </div>
                    </div>

                    <div className="flex items-center justify-center gap-6 flex-1">
                        <Button variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground hover:text-primary rounded-full transition-colors active:scale-90" onClick={() => usePlayerStore.getState().playPrev()}>
                            <SkipBack className="w-6 h-6 fill-current" />
                        </Button>

                        <Button
                            variant="default"
                            className="rounded-full w-14 h-14 p-0 shadow-2xl shadow-primary/20 hover:scale-110 active:scale-95 transition-all bg-primary text-primary-foreground border-none"
                            onClick={togglePlay}
                        >
                            {isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 ml-1" />}
                        </Button>

                        <Button variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground hover:text-primary rounded-full transition-colors active:scale-90" onClick={() => usePlayerStore.getState().playNext()}>
                            <SkipForward className="w-6 h-6 fill-current" />
                        </Button>
                    </div>

                    <div className="flex items-center justify-end gap-3 flex-1 sm:max-w-[30%]">
                        <div className="relative">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setShowPlaylistMenu(!showPlaylistMenu)}
                                className={`h-10 w-10 rounded-full transition-colors ${showPlaylistMenu ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-primary'}`}
                            >
                                <ListPlus className="w-6 h-6" />
                            </Button>

                            <AnimatePresence>
                                {showPlaylistMenu && (
                                    <div className="absolute bottom-full right-0 mb-6 z-[60]">
                                        <PlaylistMenu song={currentSong} onClose={() => setShowPlaylistMenu(false)} />
                                    </div>
                                )}
                            </AnimatePresence>
                        </div>

                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10 text-muted-foreground hover:text-red-500 rounded-full transition-colors"
                            onClick={handleToggleFavorite}
                        >
                            <Heart className={`w-5 h-5 ${user?.favorites?.includes(String(currentSong.id)) ? 'fill-red-500 text-red-500' : ''}`} />
                        </Button>

                        <div className="hidden lg:flex items-center gap-3 bg-secondary/30 h-10 rounded-full px-4 border border-white/5">
                            <Volume2 className="w-4 h-4 text-muted-foreground" />
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.01"
                                value={volume}
                                onChange={(e) => setVolume(parseFloat(e.target.value))}
                                className="w-24 h-1 bg-background/50 rounded-lg appearance-none cursor-pointer accent-primary"
                            />
                        </div>
                    </div>
                </div>

                <audio
                    ref={audioRef}
                    src={`http://localhost:5000/api/songs/download?url=${encodeURIComponent(currentSong.link || '')}&title=${encodeURIComponent(currentSong.title || '')}&artist=${encodeURIComponent(currentSong.artist?.name || '')}`}
                    crossOrigin="anonymous"
                    autoPlay={isPlaying}
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={handleLoadedMetadata}
                    onEnded={() => {
                        usePlayerStore.getState().playNext();
                    }}
                    onError={(e) => {
                        const error = (e.target as HTMLAudioElement).error;
                        console.error("Audio Load Error:", {
                            code: error?.code,
                            message: error?.message,
                            currentSong: currentSong.title,
                            streamUrl: (e.target as HTMLAudioElement).src
                        });
                    }}
                />
            </motion.div>
        </AnimatePresence>
    );
}
