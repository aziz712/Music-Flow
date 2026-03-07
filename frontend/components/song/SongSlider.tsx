"use client";

import { Song } from "@/types";
import SongCard from "./SongCard";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef } from "react";
import { motion } from "framer-motion";

interface SongSliderProps {
    title: string;
    subtitle?: string;
    songs: Song[];
    loading?: boolean;
}

export default function SongSlider({ title, subtitle, songs, loading }: SongSliderProps) {
    const scrollRef = useRef<HTMLDivElement>(null);

    const scroll = (direction: 'left' | 'right') => {
        if (scrollRef.current) {
            const { scrollLeft, clientWidth } = scrollRef.current;
            const scrollTo = direction === 'left' ? scrollLeft - clientWidth : scrollLeft + clientWidth;
            scrollRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
        }
    };

    if (loading) {
        return (
            <div className="space-y-4 py-8">
                <div className="h-8 w-48 bg-muted animate-pulse rounded-md" />
                <div className="flex gap-4 overflow-hidden">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="min-w-[200px] aspect-square bg-muted animate-pulse rounded-xl" />
                    ))}
                </div>
            </div>
        );
    }

    if (!songs || songs.length === 0) return null;

    return (
        <div className="space-y-4 py-8 group">
            <div className="flex items-end justify-between px-2">
                <div className="space-y-1">
                    <h2 className="text-3xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/60">
                        {title}
                    </h2>
                    {subtitle && <p className="text-muted-foreground text-sm font-medium">{subtitle}</p>}
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => scroll('left')}
                        className="p-3 rounded-xl border border-border/40 bg-background/40 backdrop-blur-md hover:bg-primary/10 hover:border-primary/50 transition-all active:scale-95 shadow-lg group/btn"
                    >
                        <ChevronLeft className="w-5 h-5 group-hover/btn:-translate-x-0.5 transition-transform" />
                    </button>
                    <button
                        onClick={() => scroll('right')}
                        className="p-3 rounded-xl border border-border/40 bg-background/40 backdrop-blur-md hover:bg-primary/10 hover:border-primary/50 transition-all active:scale-95 shadow-lg group/btn"
                    >
                        <ChevronRight className="w-5 h-5 group-hover/btn:translate-x-0.5 transition-transform" />
                    </button>
                </div>
            </div>

            <div
                ref={scrollRef}
                className="flex gap-5 overflow-x-auto scrollbar-hide snap-x snap-mandatory px-2 pb-4 pt-2 -mx-2"
            >
                {songs.map((song, index) => (
                    <motion.div
                        key={song.id}
                        initial={{ opacity: 0, x: 20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: index * 0.05 }}
                        className="min-w-[200px] sm:min-w-[240px] snap-start"
                    >
                        <SongCard song={song} />
                    </motion.div>
                ))}
            </div>
        </div>
    );
}
