"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Search, Sparkles, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";

export default function HomeHero() {
    const [query, setQuery] = useState("");
    const router = useRouter();

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (query.trim()) {
            router.push(`/search?q=${encodeURIComponent(query)}`);
        }
    };

    return (
        <section className="relative h-[50vh] min-h-[400px] flex flex-col items-center justify-center text-center px-4 overflow-hidden rounded-3xl bg-gradient-to-br from-primary/20 via-background to-purple-500/10 border border-border/50">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(120,119,198,0.3),rgba(255,255,255,0))]" />

            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative z-10 space-y-6 max-w-3xl"
            >
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-wider"
                >
                    <Sparkles className="w-3 h-3" />
                    Next-Gen Music Experience
                </motion.div>

                <h1 className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tight leading-tight">
                    Your Music, <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-400">Perfectly</span> Flowing.
                </h1>

                <p className="text-muted-foreground text-lg md:text-xl max-w-xl mx-auto">
                    Explore millions of high-quality tracks. Stream, archive, and discover AI-powered recommendations.
                </p>

                <form onSubmit={handleSearch} className="flex w-full max-w-lg mx-auto items-center gap-2 mt-8">
                    <div className="relative w-full group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <Input
                            placeholder="What's on your mind?"
                            className="pl-12 h-14 text-lg rounded-full border-2 border-border/50 bg-background/50 backdrop-blur-md focus:border-primary transition-all shadow-lg"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                        />
                    </div>
                    <Button size="icon" className="h-14 w-14 rounded-full shadow-lg shrink-0" type="submit">
                        <TrendingUp className="w-6 h-6" />
                    </Button>
                </form>
            </motion.div>
        </section>
    );
}
