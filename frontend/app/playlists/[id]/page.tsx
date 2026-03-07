"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getPlaylistById } from "@/services/api";
import { usePlayerStore } from "@/store/playerStore";
import { Play, Pause, Clock, ChevronLeft, Disc, Music, User, Calendar } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { motion } from "framer-motion";

export default function PlaylistPage() {
    const { id } = useParams();
    const router = useRouter();
    const [playlist, setPlaylist] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const { currentSong, isPlaying, setCurrentSong, togglePlay } = usePlayerStore();

    useEffect(() => {
        if (id) {
            getPlaylistById(id as string)
                .then(setPlaylist)
                .catch(console.error)
                .finally(() => setLoading(false));
        }
    }, [id]);

    const handlePlaySong = (song: any) => {
        // Map backend playlist song to frontend Song type
        const mappedSong = {
            id: song._id,
            title: song.title,
            artist: { name: song.artist },
            album: {
                cover_small: song.cover,
                cover_medium: song.cover,
                cover_big: song.cover,
            },
            link: song.link,
            duration: song.duration
        };

        if (currentSong?.link === song.link) {
            togglePlay();
        } else {
            setCurrentSong(mappedSong as any);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!playlist) {
        return (
            <div className="text-center py-20">
                <h1 className="text-2xl font-bold">Playlist not found</h1>
                <Button onClick={() => router.back()} className="mt-4">Go Back</Button>
            </div>
        );
    }

    return (
        <div className="min-h-screen pb-32">
            {/* Header / Hero Section */}
            <div className="relative h-[40vh] md:h-[50vh] flex items-end p-8 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent z-10" />
                <div
                    className="absolute inset-0 bg-cover bg-center blur-2xl opacity-30 scale-110"
                    style={{ backgroundImage: `url(${playlist.songs[0]?.cover || ''})` }}
                />

                <div className="container max-w-screen-xl mx-auto relative z-20 flex flex-col md:flex-row items-end gap-8 pb-4">
                    <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        className="w-48 h-48 md:w-64 md:h-64 rounded-2xl shadow-2xl overflow-hidden flex-shrink-0 bg-secondary flex items-center justify-center"
                    >
                        {playlist.songs[0]?.cover ? (
                            <img src={playlist.songs[0].cover} alt={playlist.name} className="w-full h-full object-cover" />
                        ) : (
                            <Disc className="w-24 h-24 text-muted-foreground" />
                        )}
                    </motion.div>

                    <div className="flex-1 space-y-4">
                        <motion.div
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: 0.1 }}
                        >
                            <span className="text-xs font-bold uppercase tracking-widest text-primary px-3 py-1 bg-primary/10 rounded-full border border-primary/20">Playlist</span>
                            <h1 className="text-4xl md:text-7xl font-black mt-4 leading-tight">{playlist.name}</h1>
                            {playlist.description && <p className="text-muted-foreground text-lg mt-2 font-medium">{playlist.description}</p>}
                        </motion.div>

                        <div className="flex items-center gap-6 text-sm text-muted-foreground font-medium">
                            <div className="flex items-center gap-2">
                                <User className="w-4 h-4" />
                                <span>{playlist.isPublic ? "Public Playlist" : "Private Playlist"}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Music className="w-4 h-4" />
                                <span>{playlist.songs.length} Tracks</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4" />
                                <span>Updated {new Date(playlist.updatedAt).toLocaleDateString()}</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 pt-4">
                            <Button size="lg" className="rounded-full h-14 px-8 text-lg font-bold shadow-xl hover:scale-105 transition-transform" onClick={() => handlePlaySong(playlist.songs[0])}>
                                {isPlaying && currentSong?.link === playlist.songs[0]?.link ? <Pause className="mr-2" /> : <Play className="mr-2 fill-current" />}
                                {isPlaying && currentSong?.link === playlist.songs[0]?.link ? "Pause" : "Play Mix"}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Songs List */}
            <div className="container max-w-screen-xl mx-auto px-8 mt-8">
                <div className="grid grid-cols-[auto_1fr_auto] gap-4 px-4 py-2 text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border/50 mb-2">
                    <div className="w-8 text-center">#</div>
                    <div>Title</div>
                    <div className="w-12 text-center"><Clock className="w-4 h-4" /></div>
                </div>

                <div className="space-y-1">
                    {playlist.songs.map((song: any, index: number) => {
                        const isActive = currentSong?.link === song.link;
                        return (
                            <motion.div
                                key={song._id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.03 }}
                                onClick={() => handlePlaySong(song)}
                                className={`
                                    grid grid-cols-[auto_1fr_auto] gap-4 items-center p-3 rounded-xl cursor-pointer group transition-all
                                    ${isActive ? "bg-primary/20 text-primary shadow-sm" : "hover:bg-muted/50"}
                                `}
                            >
                                <div className="w-8 text-center font-medium">
                                    {isActive && isPlaying ? (
                                        <div className="flex items-center justify-center gap-[2px] h-4">
                                            <span className="w-1 h-3 bg-primary animate-pulse" />
                                            <span className="w-1 h-4 bg-primary animate-pulse delay-75" />
                                            <span className="w-1 h-2 bg-primary animate-pulse delay-150" />
                                        </div>
                                    ) : (
                                        <span className={isActive ? "text-primary" : "text-muted-foreground group-hover:hidden"}>{index + 1}</span>
                                    )}
                                    {!isActive && <Play className="w-4 h-4 text-primary hidden group-hover:block mx-auto fill-current" />}
                                    {isActive && !isPlaying && <Play className="w-4 h-4 text-primary mx-auto fill-current" />}
                                </div>

                                <div className="flex items-center gap-4 min-w-0">
                                    <img src={song.cover} className="h-10 w-10 rounded-md object-cover flex-shrink-0 shadow-sm" />
                                    <div className="min-w-0">
                                        <p className={`font-bold truncate ${isActive ? "text-primary" : "text-foreground"}`}>
                                            {song.title}
                                        </p>
                                        <p className="text-xs text-muted-foreground truncate group-hover:text-foreground transition-colors">
                                            {song.artist}
                                        </p>
                                    </div>
                                </div>

                                <div className="w-12 text-center text-xs font-medium text-muted-foreground group-hover:text-foreground">
                                    {Math.floor(song.duration / 60)}:{(song.duration % 60).toString().padStart(2, '0')}
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
