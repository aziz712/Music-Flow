"use client";

import { usePlayerStore } from "@/store/playerStore";
import { X } from "lucide-react";
import { Button } from "../ui/Button";
import { motion, AnimatePresence } from "framer-motion";

export default function YouTubeEmbed() {
    const { isVideoOpen, videoId, closeVideo } = usePlayerStore();

    if (!isVideoOpen || !videoId) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
                onClick={closeVideo}
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="relative w-full max-w-4xl bg-black rounded-xl overflow-hidden shadow-2xl aspect-video border border-white/10"
                    onClick={(e) => e.stopPropagation()}
                >
                    <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 z-10 text-white hover:bg-white/20 rounded-full"
                        onClick={closeVideo}
                    >
                        <X className="w-6 h-6" />
                    </Button>

                    <iframe
                        width="100%"
                        height="100%"
                        src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
                        title="YouTube video player"
                        color="white"
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                        className="w-full h-full"
                    ></iframe>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
