"use client";

import { Flame, Sparkles, ListMusic } from "lucide-react";
import { motion } from "framer-motion";

const features = [
    { icon: Flame, title: "Hot Hits", desc: "Real-time trending algorithms" },
    { icon: Sparkles, title: "AI Powered", desc: "Vector similarity recommendations" },
    { icon: ListMusic, title: "Bulk Access", desc: "One-click high-speed archiving" }
];

export default function FeaturesSection() {
    return (
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-12">
            {features.map((feature, i) => (
                <motion.div
                    key={i}
                    whileHover={{ y: -5 }}
                    className="p-6 rounded-2xl border border-border/50 bg-card/30 backdrop-blur-sm hover:shadow-xl transition-all"
                >
                    <feature.icon className="w-10 h-10 text-primary mb-4" />
                    <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                    <p className="text-muted-foreground">{feature.desc}</p>
                </motion.div>
            ))}
        </section>
    );
}
