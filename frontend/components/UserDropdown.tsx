"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { Button } from "./ui/Button";
import { User, LogOut, Settings, Heart, ListMusic, UserCircle, LogIn, UserPlus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import AuthModal from "./AuthModal";

export default function UserDropdown() {
    const { user, isAuthenticated, logout, setAuthModalOpen } = useAuthStore();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const menuItems = isAuthenticated
        ? [
            { icon: UserCircle, label: "Profile", onClick: () => router.push("/profile") },
            { icon: ListMusic, label: "My Playlists", onClick: () => router.push("/playlists") },
            { icon: Heart, label: "Favorites", onClick: () => router.push("/favorites") },
            { icon: Settings, label: "Settings", onClick: () => router.push("/settings") },
            { icon: LogOut, label: "Logout", onClick: logout, variant: "destructive" },
        ]
        : [
            { icon: LogIn, label: "Login", onClick: () => setAuthModalOpen(true, 'login') },
            { icon: UserPlus, label: "Register", onClick: () => setAuthModalOpen(true, 'register') },
            { icon: Settings, label: "Settings", onClick: () =>  },
        ];

    return (
        <div className="relative" ref={dropdownRef}>
            <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(!isOpen)}
                className={`rounded-full transition-all ${isOpen ? 'bg-muted' : ''}`}
            >
                <User className="w-5 h-5" />
            </Button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="absolute right-0 mt-2 w-56 bg-card border border-border rounded-xl shadow-xl overflow-hidden py-1 z-50"
                    >
                        {isAuthenticated && (
                            <div className="px-4 py-3 border-b border-border mb-1 bg-muted/30">
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Logged in as</p>
                                <p className="text-sm font-bold truncate">{user?.name}</p>
                            </div>
                        )}

                        {menuItems.map((item, index) => (
                            <button
                                key={index}
                                onClick={() => {
                                    item.onClick();
                                    setIsOpen(false);
                                }}
                                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-muted ${item.variant === 'destructive' ? 'text-destructive' : 'text-foreground'
                                    }`}
                            >
                                <item.icon className="w-4 h-4" />
                                <span className="font-medium">{item.label}</span>
                            </button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>

        </div>
    );
}
